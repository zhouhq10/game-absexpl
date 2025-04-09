import json
import logging
import os, sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .student import StudentModel
from .teacher import TeacherModel

from utils_v2 import LLMClient, PromptTemplate, PythonExecutor
from envs.my_minigrid import ProgressiveGridEnv

logger = logging.getLogger("SwiftSage")


class TeacherStudent:
    def __init__(
        self, dataset, embeddings, prompt_template_dir, student_config, teacher_config
    ):
        prompt_template = PromptTemplate(prompt_template_dir)

        # add logger to the following LLMClient
        student_llm = LLMClient(**student_config, logger=logger)
        teacher_llm = LLMClient(**teacher_config, logger=logger)

        self.student = StudentModel(
            prompt_template, student_llm, memory_budget=3, compute_budget=5
        )
        self.teacher = TeacherModel(
            prompt_template,
            teacher_llm,
            abstraction_levels=["factual", "goal", "policy"],
        )
        self.start_with_teacher = True
        # self.executor = PythonExecutor(get_answer_from_stdout=True)
        
        self.student.experiences = []
        for com in range(1, 4):
            env = ProgressiveGridEnv(complexity_level=com)
            env.reset()
            self.student.experiences.append({
                "task_id": env.env_id,
                "env": env.render('text'),
            })

    def solve(self, env, max_iterations=10, reward_threshold=8):
        messages = []

        def log_and_append(message):
            logger.info(message)
            messages.append(message)

        log_and_append(f"Starting to solve problem: {env.env_id}")
        current_solution = "No current solution yet."  # final answer
        current_reasoning = "No reasoning steps yet."  # reasoning steps
        plan = "Initial plan: Take a deep breath and think step by step."
        solved = False

        for i in range(max_iterations):
            log_and_append(f"Iteration {i+1}")

            #  Use the Sage Agent
            if i == 0 and self.start_with_teacher:
                sage_parsed = self.teacher.generate_response(
                    self.student, env, current_reasoning, current_solution
                )
                critical_feedback = sage_parsed["critical_feedback"]
                current_reasoning = sage_parsed["reasoning_steps"]
                current_code = sage_parsed["code"]

                solved = (
                    sage_parsed["solved"].lower() == "true"
                    if i != 0
                    else sage_parsed["solved"]
                )
                log_and_append(f"Sage's decision: solved={solved}")
                if solved:
                    log_and_append(
                        "Sage has found a perfect solution. Returning the reasoning and solution."
                    )
                    return current_reasoning, current_solution, messages
                log_and_append(
                    f"Sage's feedback (iteration {i+1}):\n{critical_feedback}"
                )
                log_and_append(f"Sage's reasoning steps:\n{current_reasoning}")
                self.sage.feedbacks[i] = critical_feedback

                # run the code
                executor = PythonExecutor(get_answer_from_stdout=True)
                code_result, code_report = executor.apply(current_code)
                log_and_append(f"Sage Code execution report: {code_report}")
                log_and_append(f"Sage Code execution result: {code_result}")
                current_reasoning = (
                    current_reasoning
                    + f"\n\nThe generated code is:\n\n```python\n{current_code}\n```"
                )
                current_solution = "Answer (from running the code):\n " + code_result

                log_and_append(
                    "Activated Sage, so we should return the reasoning and solution from Sage."
                )
                return current_reasoning, current_solution, messages

            if not solved:
                # Use the Swift Agent
                swift_parsed = self.swift.generate_response(
                    problem,
                    current_reasoning,
                    current_solution,
                    plan,
                    critical_feedback,
                )

                if "code" not in swift_parsed and "final_answer" not in swift_parsed:
                    log_and_append(
                        "Swift's response does not contain the 'final_answer' or 'code' field. Returning raw response."
                    )
                    self.feedback_model.scores.append(0)
                    self.feedback_model.feedbacks.append("No feedback")
                    self.feedback_model.stagnant_count += (
                        max_iterations  # force to use Sage Agent
                    )
                    continue

                current_plan = swift_parsed["plan"]
                current_code = swift_parsed["code"]
                current_answer = swift_parsed.get("final_answer", None)

                self.swift.plans[i] = current_plan
                self.swift.codes[i] = current_code

                log_and_append(f"Swift's plan:\n{current_plan}")
                log_and_append(f"Swift's code:\n```python\n{current_code}\n```")

                import ipdb

                ipdb.set_trace()
                # Call sandbox to run the code and get the result
                executor = PythonExecutor(get_answer_from_stdout=True)
                code_result, code_report = executor.apply(current_code)
                if code_report != "Done":
                    # retry generate_response for swift
                    log_and_append(f"Code execution report: {code_report}")
                    log_and_append("Code execution failed. Retrying the Swift agent.")
                    critical_feedback = (
                        f"Code execution failed. The error message is: \n{code_report}"
                    )
                    continue
                log_and_append(f"Code execution report: {code_report}")
                log_and_append(f"Code execution result: {code_result}")

                current_reasoning = (
                    current_plan
                    + f"\nThe generated code is:\n```python\n{current_code}\n```"
                )
                current_solution = "Answer (from running the code):\n " + code_result

                # Calling the reward model to provide feedback and score
                reward_parsed = self.feedback_model.calculate_reward(
                    problem, current_reasoning, current_solution
                )
                score = int(reward_parsed["score"])
                critical_feedback = reward_parsed["feedback"]
                prev_score = (
                    self.feedback_model.scores[-1]
                    if len(self.feedback_model.scores) > 0
                    else 0
                )
                self.feedback_model.scores.append(score)
                self.feedback_model.feedbacks.append(critical_feedback)

                log_and_append(f"Reward for iteration {i+1}: {score}/10")
                log_and_append(f"Feedback: {critical_feedback}")

                if False and score < prev_score:
                    log_and_append(
                        "Score is lower than the previous score. Stopping the iteration. Reverting to the previous solution and reasoning."
                    )
                    # revert to the previous solution and reasoning
                    current_solution = self.swift.codes[i - 1]
                    current_reasoning = self.swift.plans[i - 1]
                    continue

                # critical_feedback = feedback

            if score >= reward_threshold or solved:
                log_and_append("Perfect solution found!")
                return current_reasoning, current_solution, messages

            if self.feedback_model.should_consult_sage():
                log_and_append(
                    "Reward model: The solution quality hasn't improved recently. Consulting Sage for the next iteration."
                )

        log_and_append("Max iterations reached without finding a perfect solution.")
        log_and_append("Problem solving completed")
        return current_reasoning, current_solution, messages
