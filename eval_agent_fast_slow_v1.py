import argparse
import os
import re
import time
import torch
import random
import copy
from scienceworld import ScienceWorldEnv
import json
from tqdm import trange
from data_utils.data_utils import (
    add_current_place,
    add_current_objects,
    sanitizeStr,
    formalize_action,
)
from data_utils.data_utils import (
    compose_instance_v4,
)
from eval_utils import (
    load_model,
    findValidActionNew,
    load_variation,
    get_model_output,
    findValidActionWithSystem2,
    getFilteredValidActions,
    sbert_search,
    clean_look,
    is_action_failed,
)
from eval_utils import (
    try_to_replace,
    rooms,
    clean_history,
    get_current_room,
    clean_obj_name,
    focus_on_count,
    rank_candidates_by_common_words,
    gpt_select_valid,
)
from collections import defaultdict


# from scienceworld
from py4j.java_gateway import (
    JavaGateway,
    GatewayParameters,
    launch_gateway,
    CallbackServerParameters,
)
from scienceworld.constants import BASEPATH, DEBUG_MODE, ID2TASK, JAR_PATH, NAME2ID
from scienceworld.utils import infer_task
import logging

logger = logging.getLogger(__name__)


class MyScienceWorldEnv(ScienceWorldEnv):
    # it is only used for fixing the logging error --> logger.info(f"ScienceWorld server running on {port}")
    def __init__(self, taskName=None, serverPath=None, envStepLimit=100):
        serverPath = serverPath or JAR_PATH  # Use the builtin jar.

        # Launch the server and connect to the JVM.
        # Launch Java side with dynamic port and get back the port on which the
        # server was bound to.
        if DEBUG_MODE:
            import sys, time

            port = launch_gateway(
                classpath=serverPath,
                die_on_exit=True,
                cwd=BASEPATH,
                javaopts=[
                    "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005,quiet=y"
                ],
                redirect_stdout=sys.stdout,
                redirect_stderr=sys.stderr,
            )
            print("Attach debugger within the next 10 seconds")
            time.sleep(10)  # Give time for user to attach debugger
        else:
            port = launch_gateway(classpath=serverPath, die_on_exit=True, cwd=BASEPATH)

        # Connect python side to Java side with Java dynamic port and start python
        # callback server with a dynamic port
        self._gateway = JavaGateway(
            gateway_parameters=GatewayParameters(auto_field=True, port=port),
            callback_server_parameters=CallbackServerParameters(port=0, daemonize=True),
        )

        # Retrieve the port on which the python callback server was bound to.
        python_port = self._gateway.get_callback_server().get_listening_port()

        # Tell the Java side to connect to the python callback server with the new
        # python port. Note that we use the java_gateway_server attribute that
        # retrieves the GatewayServer instance.
        self._gateway.java_gateway_server.resetCallbackClient(
            self._gateway.java_gateway_server.getCallbackClient().getAddress(),
            python_port,
        )

        self.server = self._gateway.jvm.scienceworld.runtime.pythonapi.PythonInterface()
        logger.info(f"ScienceWorld server running on {port}")

        # Keep track of the last step score, to calculate reward from score
        self.lastStepScore = 0

        # Load the script
        self.taskName = taskName
        if self.taskName:
            self.load(taskName, 0, "")

        # Set the environment step limit
        self.envStepLimit = envStepLimit

        # Clear the run histories
        self.clearRunHistories()

        # By default, set that the gold path was not generated unless the user asked for it
        self.goldPathGenerated = False


import logging
from logging import INFO, WARN

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_file_name(args, task_num):
    if len(args["output_path"]) > 0:
        if not args["output_path"].endswith("/"):
            args["output_path"] += "/"

        # Make path if it doesn't exist
        if not os.path.exists(args["output_path"]):
            os.makedirs(args["output_path"])

    filenameOutPrefixSeed = args["output_path"] + "task" + str(task_num)

    return filenameOutPrefixSeed


# Example user input console, to play through a game.
def eval(args, task_num, logger):
    # # Sets up the environment, loads models, and initializes tracking variables
    # - Loads composition mode and demo data if provided
    compose_instance = compose_instance_v4
    demo_data = None
    if args["demo_file"]:
        with open(args["demo_file"]) as f:
            # demo: a dict with keys as task_id and values as a list of demos
            demo_data = json.load(f)

    # - Initializes the science world environment
    # env = ScienceWorldEnv("", args["jar_path"], envStepLimit = args["env_step_limit"], threadNum = 0)
    # original env in scienceworld: https://github.com/allenai/ScienceWorld/blob/c5e7187f745503751f323e80aa44373acd5451f8/scienceworld/scienceworld.py
    env = MyScienceWorldEnv("", args["jar_path"], envStepLimit=args["env_step_limit"])
    taskNames = env.getTaskNames()  # list of task names
    taskName = taskNames[task_num]
    env.load(
        taskName=taskName, variationIdx=0, simplificationStr=args["simplification_str"]
    )

    # - Loads language models, tokenizer, and SBERT model
    lm_model, tokenizer, sbert_model, llm = load_model(args, device)  # ??? what is llm

    # - Sets up basic tracking variables for scores and variations
    variations = load_variation(env, args, task_num, logger)
    filenameOutPrefixSeed = get_file_name(args, task_num)
    gpt_version = args["gpt_version"]
    scores = []

    # # Runs through different variations of the task
    # - Loads task description and environment
    # - Initializes tracking lists for actions, observations, locations, etc.
    # - Sets up initial state with 'look around' action
    for variation in variations:
        if args["debug_var"] >= 0 and variation != args["debug_var"]:
            logger.info(
                f"Skipping the Var: {variation} because we only focus on args['debug_var'']={args['debug_var']}"
            )
            continue
        # train_data = []
        env.load(taskName, variation, args["simplification_str"], generateGoldPath=True)
        task_description = env.taskdescription()[
            18:
        ]  # env.taskdescription() starts with "Task Description:"
        logger.info(f"task_description = {task_description}")
        recent_actions = ["look around"]
        recent_obs = ["N/A"]
        recent_locs = []
        recent_looks = {}
        recent_looks_flatten = []
        recent_scores = [
            0.0,
        ]
        recent_reward = [0.0]
        places = []
        objects = []

        obs, info = env.reset()
        current_place = get_current_room(info["look"])
        recent_locs.append(current_place)
        recent_looks[current_place] = info["look"]
        recent_looks_flatten.append(info["look"])

        prev_obs = "N/A"
        prev_action = "look around"

        done = False
        score = 0.0
        last_score = 0.0
        step = 0

        # The env has an internal step count, some actions like look around are free
        # however, the t5 model only generates the action "look around", which will result in a dead loop below
        # so the max_steps here is only used to avoid the model generating the same action forever
        max_steps = args["env_step_limit"] * 2

        # # Has two main paths for generating actions:
        # a) Action Buffer System:
        # - Tries to execute actions from a pre-generated buffer
        # - Validates actions against environment
        # - Handles failed actions and retries

        # b) Fast/Slow Agent System:
        # - Fast Agent: Uses direct language model generation
        # - Slow Agent: More sophisticated planning system
        # - Switches between systems based on performance
        action_buffer = []
        obs_buffer = []  # guess_obs_list
        failed_action_trial = defaultdict(lambda: 0)
        last_time_system2_steps = [-1]
        last_time_system2 = -1
        consecutive_system2 = 0
        focus_on_done = False
        useful_focus_on = []
        no_action_done = 0
        system_2_focused = False
        system_1_focused_trial = 0
        pattern = r"focus on\s+(\b\w+\b(\s+\b\w+\b)*)"
        matches = re.findall(pattern, task_description)
        to_focus = [match[0].replace("the ", " ").strip() for match in matches]
        logger.info(f"to_focus={to_focus}")
        failed_messages = []

        # The main loop for the agent to take actions
        while not done:
            no_action_done += 1

            logger.info("-" * 50 + f"Variation: {variation}, Step: {step}" + "-" * 50)
            logger.info(f"Action Buffer: {action_buffer}")
            logger.info(f"Guess Obs Buffer: {obs_buffer}")
            validActions = getFilteredValidActions(
                env=env, look=info["look"], task_id=task_num, task_desc=task_description
            )
            logger.info(f"look = \n {str(info['look'])}")
            logger.info(f"inventory = \n {str(env.inventory())}")
            logger.info(f"validActions= {validActions}")
            action = None
            executed = False

            add_current_place(obs, info["look"], places)
            add_current_objects(task_num, info["look"], objects, limit=20)

            current_place = get_current_room(info["look"])
            recent_looks[current_place] = info["look"]
            recent_looks_flatten.append(info["look"])

            # Wait one more time
            if (
                step > 3
                and recent_actions[-1] == "wait"
                and recent_actions[-2] != "wait"
            ):
                if recent_looks_flatten[-1] == recent_looks_flatten[-2]:
                    action = "wait"

            # a) Action Buffer System
            # Tries to use actions from a pre-existing buffer before generating new ones
            if action is None and len(action_buffer) > 0:
                # Has 5 strategies to try executing actions from the buffer:
                # debug
                buffer_overall_trail = 0
                to_remove = []

                for action_ind, action_candidate in enumerate(action_buffer):
                    if buffer_overall_trail >= 2 or (
                        buffer_overall_trail >= 1
                        and action_candidate.startswith("focus on")
                    ):
                        action_buffer = []
                        obs_buffer = []
                        break

                    buffer_overall_trail += 1
                    if action_candidate.startswith("focus on") and focus_on_done:
                        logger.info(
                            f"Removed {action_candidate} from the buffer, because the focus on limit exceed"
                        )
                        to_remove.append(action_ind)
                        continue

                    if action_candidate.startswith("focus on") and any(
                        ["focus on" in a for a in action_buffer[:action_ind]]
                    ):
                        logger.info(
                            f"Skip {action_candidate} from the buffer, because there is a previous unfinished focus on"
                        )
                        continue

                    if action_candidate in ["examine " + r for r in rooms]:
                        logger.info(
                            f"Removed {action_candidate} from the buffer (not useful)."
                        )
                        to_remove.append(action_ind)
                        continue

                    action_candidate = try_to_replace(
                        action_candidate, validActions, info["look"], info["inv"]
                    )
                    if action_buffer[action_ind] != action_candidate:
                        logger.info(
                            f"Replace {action_buffer[action_ind]} --> {action_candidate}."
                        )
                        # logger.info(f"validActions= {validActions}")

                    if failed_action_trial.get(action_candidate, 0) >= 3:
                        logger.info(
                            f"Removed {action_candidate} from the buffer because we have tried this action for 3 times."
                        )
                        to_remove.append(action_ind)
                        continue

                    ### 1) execute the action if it is valid

                    if action_candidate in validActions:
                        action_buffer.pop(action_ind)
                        obs_buffer.pop(action_ind)
                        action = action_candidate
                        buffer_overall_trail = 0
                        break

                    ### 2) try to execute the obs as if it is an action

                    action_candidate_v2 = (
                        obs_buffer[action_ind].lower()
                        if formalize_action(obs_buffer[action_ind].lower()) is not None
                        else None
                    )
                    action_candidate_v2 = (
                        None
                        if action_candidate_v2 == action_candidate
                        else action_candidate_v2
                    )

                    if action_candidate_v2 and action_candidate_v2 in validActions:
                        action_buffer.pop(action_ind)
                        obs_buffer.pop(action_ind)
                        action = action_candidate_v2
                        buffer_overall_trail = 0
                        break

                    ### 3) try to execute the action if v1 and v2 are both not valid
                    action_accepted = False
                    final_action = ""
                    action_trials = [action_candidate]
                    if action_candidate_v2:
                        action_trials.append(action_candidate_v2)
                    action_trials.sort(key=lambda x: len(x), reverse=True)

                    for act_cand in action_trials:
                        if not act_cand:
                            continue
                        obs, reward, done, info = env.step(act_cand)
                        logger.info(f"Trying to execute [{act_cand}] in the buffer.")
                        if is_action_failed(obs):
                            logger.info(f"\t\t Failed: [{act_cand}] --> {obs}")
                            # failed_messages.append(f"\t\t Failed action: [{act_cand}] --> {obs}")
                            if act_cand == action_candidate:
                                failed_messages.append(
                                    f"\t\t Failed action: (in {current_place}) [{act_cand}] --> {obs}"
                                )
                        else:
                            action_accepted = True
                            final_action = act_cand
                            break

                    if action_accepted:
                        logger.info(f"\t\t Success: [{final_action}] --> {obs}")
                        executed = True
                        action_buffer.pop(action_ind)
                        obs_buffer.pop(action_ind)
                        action = final_action
                        buffer_overall_trail = 0
                        break
                    else:
                        failed_action_trial[action_candidate] += 1

                    ### 4) use gpt to search the valid candidate
                    if not action_candidate.startswith("focus on"):
                        candidates = rank_candidates_by_common_words(
                            action_candidate, validActions
                        )[:30]
                        if len(candidates) == 0:
                            failed_action_trial[action_candidate] += 1
                        elif len(candidates) == 1:
                            action_buffer[action_ind] = candidates[0]
                        elif len(candidates) >= 2:
                            logger.info(f"searching = [{action_candidate}] with gpt")
                            selections = gpt_select_valid(
                                action_candidate,
                                candidates,
                                clean_look(info["look"]),
                                info["inv"],
                                obs_buffer[action_ind],
                                logger.info,
                                1,
                                gpt_version,
                            )
                            # # intersection = set(sbert_results) & set(edit_results)
                            # if len(intersection) == 0:
                            #     continue
                            for s in selections:
                                if s in candidates:
                                    action = s
                                    break
                            if action in validActions:
                                action_buffer.pop(action_ind)
                                obs_buffer.pop(action_ind)
                                buffer_overall_trail = 0
                                logger.info(
                                    f"mathced = [{action_candidate}] --> {selections}"
                                )
                                break

                            # # if s is a new compose
                            # action_buffer[action_ind] = selections[0]
                            # logger.info(f"mathced = [{action_candidate}] --> {selections} (update the buffer)")

                    #### 5) no matching at all.
                    to_remove.append(action_ind)
                action_buffer = [
                    a for ind, a in enumerate(action_buffer) if ind not in to_remove
                ]
                obs_buffer = [
                    o for ind, o in enumerate(obs_buffer) if ind not in to_remove
                ]

            # b) Fast/Slow Agent System
            if action is None:
                logger.info("Buffer is not useful. Switch to Fast Agent.")
                input_str = ""

                # Note that the agent is allowed to know the score changes.
                returns_to_go = 1.0 - float(info["score"]) * 0.01
                returns_to_go = round(returns_to_go, 2)

                mode = args["mode"]
                logger.info("Mode: " + mode)

                # ? why removing certain actions
                (
                    clean_recent_actions,
                    clean_recent_obs,
                    clean_recent_scores,
                    clean_recent_reward,
                    _,
                ) = clean_history(
                    recent_actions,
                    recent_obs,
                    recent_scores,
                    recent_reward,
                    recent_locs,
                )
                input_str, _ = compose_instance(
                    mode=mode,
                    step_id=step + 1,
                    task_desc=task_description,
                    returns_to_go=returns_to_go,
                    curr_action=None,
                    curr_obs=obs,
                    inventory=info["inv"],
                    look=info["look"],
                    prev_action=prev_action,
                    prev_obs=prev_obs,
                    objects=objects,
                    places=places,
                    recent_actions=clean_recent_actions,
                    recent_obs=clean_recent_obs,
                    recent_scores=clean_recent_scores,
                    recent_reward=clean_recent_reward,
                )

                ############
                prev_obs = obs

                # Get valid actions at this point
                if args["slow_agent"]:
                    force_system_2 = False
                    force_system_1 = False

                    # Switching logic for the fast/slow agent system
                    # Force system 2 when
                    # - No action has been done for 2 times
                    if no_action_done >= 2 or len(failed_messages) >= 2:
                        force_system_1 = False
                        force_system_2 = True
                        logger.info("Force to do force_system_2")
                    # - After system 1 has tried to focus on at least once
                    if not system_2_focused and system_1_focused_trial >= 1:
                        force_system_1 = False
                        force_system_2 = True
                        logger.info("Force to do force_system_2")
                    # Force system 1 when
                    # - System 2 has been used for 2 times
                    if consecutive_system2 >= 2:
                        force_system_1 = True
                        force_system_2 = False
                        logger.info("Force to do force_system_1")

                    # Sanitizes the input string
                    # Both systems use the same input string
                    input_str = sanitizeStr(input_str)
                    logger.info("InputStr: " + input_str)
                    predStrs = get_model_output(
                        args, input_str, tokenizer, lm_model, device, logger
                    )

                    # - But the slow agent has more sophisticated planning system
                    import ipdb

                    ipdb.set_trace()
                    used_sys2, return_result = findValidActionWithSystem2(
                        predStrs,
                        env,
                        task_num,
                        task_description,
                        info["look"],
                        recent_actions,
                        recent_reward,
                        recent_obs,
                        recent_locs,
                        recent_looks,
                        failed_messages,
                        demo_data,
                        logger,
                        sbert_model,
                        step,
                        last_time_system2_steps,
                        useful_focus_on,
                        focus_on_done,
                        force_system_1,
                        force_system_2,
                        gpt_version,
                        llm=llm,
                    )

                    import ipdb

                    ipdb.set_trace()
                    if not used_sys2:
                        action = return_result
                        consecutive_system2 = 0
                    else:
                        action = None
                        action_buffer = return_result[0]  # reset the buffer
                        obs_buffer = return_result[1]
                        failed_messages = []  # reset the failed messages
                        logger.info(f"action_buffer reset by the Slow Agent")
                        failed_action_trial = defaultdict(lambda: 0)
                        last_time_system2 = step
                        last_time_system2_steps.append(step)
                        consecutive_system2 += 1
                        continue

                    if action is not None and action not in validActions:
                        logger.info(f"action '{action}' is not in validActions; ")
                        action = "wait"
                        action_buffer.append(action)
                        obs_buffer.append(action)
                        continue

                    elif action is None:
                        continue
                else:
                    # Fast Agent only
                    input_str = sanitizeStr(input_str)
                    logger.info("InputStr: " + input_str)
                    predStrs = get_model_output(
                        args, input_str, tokenizer, lm_model, device, logger
                    )
                    action = findValidActionNew(
                        predStrs, env, info["look"], recent_actions, sbert_model, logger
                    )

            # # Handles action execution and result tracking
            # - Executes chosen action in environment
            # - Records observations, rewards, and scores
            # - Handles special cases like "focus on" actions
            # - Tracks failed actions and their messages
            if action.startswith("focus on") and focus_on_done:
                logger.info(
                    f"You have already done great focus-on action: {useful_focus_on}. Skipping this [{action}]"
                )
                continue

            if action.startswith("focus on") and consecutive_system2 > 0:
                system_2_focused = True

            if action.startswith("focus on") and not system_2_focused:
                system_1_focused_trial += 1
                if system_1_focused_trial >= 3 or any(
                    [clean_obj_name(tf) in clean_obj_name(action) for tf in to_focus]
                ):
                    logger.info(
                        f"You have never used System 2 to focus on... but system_1 has tried multiple times... so okay with [{action}]"
                    )
                else:
                    logger.info(
                        f"You have never used System 2 to focus on... so skip [{action}]"
                    )
                    continue

            if not executed:
                obs, reward, done, info = env.step(action)

            if obs.startswith("Ambiguous request"):
                # choose 0
                obs, reward, done, info = env.step("0")

            no_action_done = 0
            score = info["score"]
            prev_action = action
            reward = score - last_score
            recent_reward.append(reward / 100)
            recent_scores.append(score / 100)
            recent_actions.append(action)
            recent_obs.append(obs)
            recent_locs.append(current_place)

            if is_action_failed(obs):
                logger.info(f"\t\t Failed: [{action}] --> {obs}")
                failed_messages.append(
                    f"\t\t Failed action: (in {current_place}) [{action}] --> {obs}"
                )

            if reward > 0 and action.startswith("focus on"):
                useful_focus_on.append(action)
                if len(useful_focus_on) == max(
                    focus_on_count[str(task_num)], task_description.count("focus")
                ):
                    focus_on_done = True

            if score < 0 or (
                len(recent_reward) >= 100 and sum(recent_reward[-30:]) == 0
            ):
                # Note: our own solution for dealing with such cases; It is different from the official ScienceWorld evaluation script. You can find our discussion in the Issues.
                if args["no_stop"]:
                    done = True
                    score = last_score
                else:
                    done = True
                    score = 0
            last_score = score

            # logger.info("Input string: " + str(input_str))
            logger.info(f"Variation: {variation}, Step: {step}")
            logger.info(f"Action: {action}")
            logger.info("Obs: " + sanitizeStr(obs))
            logger.info(f"Score: {score}")
            if recent_reward[-1] > 0:
                logger.info(f"Reward: +{recent_reward[-1]*100}")
            else:
                logger.info("No reward.")

            step += 1
            if (step >= max_steps) or done:
                break

            logger.info("Recent Actions: " + str(recent_actions))
            logger.info("Recent Observations: " + str(recent_obs))
            logger.info("Recent Reward: " + str(recent_reward))

        # Store results
        env.storeRunHistory(
            variation, notes={"mode": args["mode"], "lm": str(args["lm_path"])}
        )
        env.saveRunHistoriesBufferIfFull(
            filenameOutPrefixSeed, maxPerFile=args["max_episode_per_file"]
        )

        scores.append(score)

        logger.info("Run completed...")
        logger.info("Scores: " + str(scores))

        time.sleep(2)

    # # Manages episode progression and termination
    # - Checks for episode completion conditions
    # - Updates history and scores
    # - Handles early termination cases
    # - Logs progress and results
    env.saveRunHistoriesBufferIfFull(
        filenameOutPrefixSeed, maxPerFile=args["max_episode_per_file"], forceSave=True
    )

    avg = sum(scores) / len(scores)
    logger.info("Average score: " + str(avg))

    f = open(filenameOutPrefixSeed + "-score.txt", "a")
    f.write(
        "\n"
        + "Task name:"
        + taskName
        + "Scores: "
        + str(scores)
        + " Average score: "
        + str(avg)
        + " Args: "
        + str(args)
        + "\n"
    )
    f.close()

    logger.info("Shutting down server...")
    # env.shutdown()

    logger.info("Completed.")


def parse_args():
    parser = argparse.ArgumentParser()
    debug = True
    parser.add_argument("--jar_path", type=str)
    parser.add_argument("--task_nums", default="11")  # use comma to split
    parser.add_argument(
        "--env_step_limit", type=int, default=300
    )  # for different tasks, this should be different
    parser.add_argument("--lm_path", default="yuchenlin/swift_sw")
    parser.add_argument("--simplification_str", default="easy")
    parser.add_argument("--beams", type=int, default=5)
    parser.add_argument("--max_episode_per_file", type=int, default=9999)
    parser.add_argument("--mode", default="fast_system")
    parser.add_argument("--set", default="test_mini")
    parser.add_argument(
        "--output_path",
        default="/mnt/lustre/work/wu/wkn601/absexpl_data/swift_science_logs/test_fast_slow_agent_0424_debug",
    )
    parser.add_argument("--compose_mode", default="v4")
    parser.add_argument("--model_parallelism_size", type=int, default=1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max_input_len", type=int, default=1024)
    parser.add_argument("--cut_off", action="store_true", default=True)
    parser.add_argument("--sbert", action="store_true", default=True)
    parser.add_argument("--no_stop", action="store_true", default=True)
    parser.add_argument("--slow_agent", action="store_true", default=True)
    parser.add_argument("--gpt_version", default="gpt-4", type=str)
    parser.add_argument("--local_llm", default="none", type=str)
    parser.add_argument("--demo_file", default="data_utils/demos.json", type=str)
    parser.add_argument("--debug_var", type=int, default=93)
    args = parser.parse_args()
    params = vars(args)
    return params


#
#   Main
#


def init_logger(args, task_num, log_level=INFO):
    filenameOutPrefixSeed = get_file_name(args, task_num)
    # Creates a logger instance
    logger = logging.getLogger()

    # Defines how log messages will be formatted
    formatter = logging.Formatter(
        "[%(asctime)s][%(levelname)s\t] %(message)s",  # Format: [timestamp][LOG_LEVEL] message
        datefmt="%Y-%m-%d %H:%M:%S",  # Date format
    )

    # Sets the overall logging level
    logger.setLevel(log_level)

    # Sets up logging to console (terminal)
    ch = logging.StreamHandler()
    ch.setLevel(log_level)
    ch.setFormatter(formatter)
    logger.addHandler(ch)
    logging_dir = args["output_path"]
    if logging_dir:
        # Creates output directory if it doesn't exist
        os.makedirs(logging_dir, exist_ok=True)

        # Generates timestamp
        now = int(round(time.time() * 1000))
        timestr = time.strftime("%Y-%m-%d_%H-%M", time.localtime(now / 1000))

        # Creates log file with specified name
        filename = f"{filenameOutPrefixSeed}.log"

        # Sets up file logging
        fh = logging.FileHandler(filename)
        fh.setLevel(log_level)
        fh.setFormatter(formatter)

        # Clears any existing handlers and adds the file handler
        if logger.hasHandlers():
            logger.handlers.clear()
        logger.addHandler(fh)
    return logger


def main():
    args = parse_args()
    print(args)

    torch.manual_seed(args["seed"])
    torch.cuda.manual_seed(args["seed"])
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True

    task_nums = args["task_nums"].split(",")
    for task_num in task_nums:
        logger = init_logger(args, task_num)
        logger.info(args)
        eval(args, int(task_num), logger)


if __name__ == "__main__":
    main()
