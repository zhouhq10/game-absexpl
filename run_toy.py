import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import multiprocessing
import random

import gym
from gymnasium.envs.registration import register

from envs.my_minigrid import ProgressiveGridEnv
from agents.teacherstudent import TeacherStudent

from utils_v2.commons import api_configs, setup_logging

    
def parse_args():
    parser = argparse.ArgumentParser()

    parser.add_argument("-p", "--problem", default="minigrid",type=str)

    parser.add_argument("--api_provider", default="Together", choices=["Together", "SambaNova"], type=str)
    parser.add_argument("--student_model_id", default="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free", type=str)
    parser.add_argument("--teacher_model_id", default="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", type=str)
    parser.add_argument("--prompt_template_dir", default="/mnt/lustre/work/wu/wkn601/absexpl_data/swift_prompt_templates", type=str)
    
    # parser.add_argument("--feedback_model_id", default="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", type=str)
    # parser.add_argument("--sage_model_id", default="meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", type=str)
    
    parser.add_argument("--max_iterations", default=5, type=int)
    parser.add_argument("--reward_threshold", default=8, type=int)

    parser.add_argument("--student_temperature", default=0.5, type=float, help="Temperature for the student model")
    parser.add_argument("--student_top_p", default=0.9, type=float, help="Top-p sampling for the student model")
    parser.add_argument("--teacher_temperature", default=0.5, type=float, help="Temperature for the teacher model")
    parser.add_argument("--teacher_top_p", default=0.9, type=float, help="Top-p sampling for the teacher model")
    
    args = parser.parse_args()
    
    return args


def main():
    args = parse_args()
    multiprocessing.set_start_method('spawn')

    student_config = {
        "model_id": args.student_model_id,
        "api_config": api_configs[args.api_provider],
        "temperature": args.student_temperature,
        "top_p": args.student_top_p,
        "max_tokens": 2048,
    }
    teacher_config = {
        "model_id": args.teacher_model_id,
        "api_config": api_configs[args.api_provider],
        "temperature": args.teacher_temperature,
        "top_p": args.teacher_top_p,
        "max_tokens": 2048,
    }
    
    logger = setup_logging()
    
    # specify the path to the prompt templates
    prompt_template_dir = args.prompt_template_dir
    dataset = [] 
    embeddings = [] # TODO: for retrieval augmentation (not implemented yet now)
    s2 = TeacherStudent(
        dataset,
        embeddings,
        prompt_template_dir,
        student_config,
        teacher_config,
    )

    def run_test(s2, env, max_iterations=5, reward_threshold=8):
        logger.info(f"Testing problem: {env.grid}")
        reasoning, solution, messages = s2.solve(env, max_iterations, reward_threshold)
        logger.info(f"Final reasoning:\n{reasoning}")
        logger.info(f"Final solution:\n{solution}")
        logger.info("=" * 50)
        
    envs = []
    for level in range(4, 8):
        import ipdb; ipdb.set_trace()
        # env_id = f'MiniGrid-Progressive-{level}-v0'
        env = ProgressiveGridEnv(complexity_level=level)
        envs.append(env)
        obs = env.reset()
        logger.info(f"Level {level} environment:")
        logger.info(f"Grid environment: {env.render('text')}")
        
        done = False
        
        run_test(s2, env, args.max_iterations, args.reward_threshold)
        
        
        
        
        
        # Initial Explanation
        initial_explanation = teacher.generate_explanation([], False, stage='beginning')
        student.receive_explanation(initial_explanation)

        while not done:
            student.perceive(obs)
            action = student.deliberate()
            obs, reward, done, info = env.step(action)

            if reward < 0:  # student error detected
                missing_knowledge, ineffective_policy = teacher.diagnose_student(student.beliefs, student.policy, env_info=['lava', 'key', 'door'])
                explanation = teacher.generate_explanation(missing_knowledge, ineffective_policy, stage='middle')
                student.receive_explanation(explanation)
                student.update_policy({'avoid': obs['agent_pos']})

        final_feedback = {'memory_overload': len(student.beliefs) >= student.memory_budget,
                        'computation_overload': len(student.policy) >= student.compute_budget}

        teacher.provide_feedback(final_feedback)

        # Reflective Explanation
        reflective_explanation = teacher.generate_explanation([], False, stage='finished')
        student.receive_explanation(reflective_explanation)






    # test_problems = [
    #     "Solve the equation: 2x + 5 = 13", # 0
    #     "If h(x)=x-4 and g(h(x))=x^2-8x+10, find g(x)? show the formula for g(x)", # 1
    #     "Solve the equation: 6y + 5 = 29", # 2
    #     "Who lives longer, Lowell Sherman or Jonathan Kaplan?", # 3
    #     "9.9 or 9.11 --  which is bigger?", # 4
    #     "How can you solve the quadratic equation 3x^2 + 7.15x + 4 = 0 using the quadratic formula?", # 5
    #     "Explain why sound waves cannot travel in a vacuum?", # 6
    #     "How many grams of hydrogen (H) are present in 23.5 grams of water (H2O)?", # 7
    #     "What is the distance between the points (2, 3) and (5, 8)?", # 8
    #     "Why can the Hubble telescope capture clear images of distant stars and galaxies, but not a detailed image of Pluto?", # 9
    #     """A rectangular band formation is a formation with $m$ band members in each of $r$ rows, where $m$ and $r$ are integers. A particular band has less than 100 band members. The director arranges them in a rectangular formation and finds that he has two members left over. If he increases the number of members in each row by 1 and reduces the number of rows by 2, there are exactly enough places in the new formation for each band member. What is the largest number of members the band could have?""",
    #     """Tim wants to invest some money in a bank which compounds quarterly with an annual interest rate of $7\%$. To the nearest dollar, how much money should he invest if he wants a total of $\$60,\!000$ at the end of $5$ years?""",
    #     """In an SR latch built from NOR gates, which condition is not allowed

    #     Options:
    #     [ "S=0, R=2", "S=2, R=2", "S=1, R=1", "S=1, R=-1", "S=1, R=2", "S=0, R=0", "S=2, R=0", "S=1, R=0", "S=2, R=1", "S=0, R=1" ]

    #     Which one is the correct answer?""",
    #     # ... add other problems here ...
    #     """How many letter r are there in the word "strawberry"?"""
    # ]

    # if not args.problem:
    #     problem = random.choice(test_problems)
    #     print(f"Problem: {problem}")
    # else:
    #     problem = args.problem
    


if __name__ == '__main__':
    # # Update the registration
    # for level in range(1, 11):
    #     register(
    #         id=f'MiniGrid-Progressive-{level}-v0',
    #         entry_point='game-absexpl.envs.minigrid:ProgressiveGridEnv',  
    #         kwargs={'complexity_level': level}
    #     )
    
    main()
