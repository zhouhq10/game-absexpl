import json
import logging

import numpy as np
import datetime
import json
import logging
import os
import re

import dirtyjson
import hjson
import numpy as np
import openai
from fuzzywuzzy import process
from sklearn.metrics.pairwise import cosine_similarity

from agents import Agent

logger = logging.getLogger("SwiftSage")


import openai
import json
import numpy as np

logger = logging.getLogger("SwiftSage")

# from commons.py
def extract_and_parse_markup(text):
    keys = [
        "teacherSolution",
        "studentDiagnosis",
        "explanationSymbolic",
        "explanationNatural",
    ]
    result = {}
    if "<final_answer>" in text and "</final_answer>" not in text:
        text = text + "</final_answer>"
    if "<score>" in text and "</score>" not in text:
        text = text + "</score>"

    for key in keys:
        # Create a pattern for each key
        pattern = f"<{key}>(.*?)</{key}>"

        # Search for the pattern in the text
        match = re.search(pattern, text, re.DOTALL)

        if match:
            # Extract the content, strip whitespace, and add to the result
            content = match.group(1).strip()
            result[key] = content

    if "code" in result.keys():
        # find the first full code block inside ```python and ``` and extract the code if any
        if "```python" in result["code"]:
            code_block_pattern = r"```python\s*([\s\S]*?)\s*```"
            code_blocks = re.findall(code_block_pattern, result["code"], re.IGNORECASE)
            if code_blocks:
                result["code"] = code_blocks[0]

    return result


class TeacherModel(Agent):
    def __init__(self, prompt_template, llm_client, abstraction_levels=['factual', 'goal', 'policy']):
        super().__init__(prompt_template, llm_client)
        self.feedbacks = {}
        self.plans = {}
        
        self.abstraction_levels = abstraction_levels
        self.student_history = []
        # Hierarchical RAG structured as {task_id: {"factual": prog, "goal": prog, "policy": prog}}
        self.hierarchical_RAG = {}

    def symbolic_to_natural(self, symbolic_program, abstraction='factual'):
        prompt = f"""
        Convert this symbolic instruction sequence into a natural language explanation with {abstraction} abstraction:
        {symbolic_program}
        """
        response = openai.ChatCompletion.create(
            model='gpt-4-turbo',
            messages=[{"role": "system", "content": prompt}]
        )
        return response.choices[0].message.content

    def natural_to_symbolic(self, natural_language):
        prompt = f"""
        Convert the following natural language instructions into a symbolic program sequence:
        "{natural_language}"
        """
        response = openai.ChatCompletion.create(
            model='gpt-4-turbo',
            messages=[{"role": "system", "content": prompt}]
        )
        symbolic_program = response.choices[0].message.content
        return symbolic_program

    def refactor_rag(self, task_id, abstraction):
        pass
    
    def update_rag(self, task_id, symbolic_program):
        # Update all abstraction levels
        factual_desc = symbolic_program
        goal_desc = symbolic_program[:len(symbolic_program)//2]  # simple heuristic
        policy_desc = symbolic_program[::2]  # another heuristic

        self.hierarchical_RAG[task_id] = {
            "factual": factual_desc,
            "goal": goal_desc,
            "policy": policy_desc
        }
    
    def retrieve_program(self, task_id, abstraction):
        """
        Retrieve the optimal symbolic program from the hierarchical RAG based on the given abstraction level.
        If no program exists for the given abstraction, generate a new solution.
        """
        # TODO: Implement RAG retrieval
        # TODO: maybe the content should be a list of goal-conditioned programs
        # Should retrive while also generate new solutions 
        
        if task_id not in self.hierarchical_RAG:
            logger.error(f"Task ID {task_id} not found in hierarchical RAG.")
            return None

        if abstraction not in self.hierarchical_RAG[task_id]:
            logger.error(f"Abstraction level {abstraction} not found for Task ID {task_id}.")
            return None

        # Retrieve the program based on the abstraction level
        program = self.hierarchical_RAG[task_id][abstraction]

        if not program:
            logger.info(f"No existing program found for Task ID {task_id} at {abstraction} abstraction. Generating new solution.")
            # Generate a new solution using the LLM client
            prompt = f"""
            Generate a symbolic program for the task with the following abstraction level: {abstraction}.
            Task ID: {task_id}
            """
            response = self.llm_client.generate_response([{"role": "system", "content": prompt}])
            program = response.choices[0].message.content
            # Update the RAG with the new program
            self.hierarchical_RAG[task_id][abstraction] = program

        return program
        
    def diagnose_student(self, student_beliefs, student_policy, env_info):
        # TODO: should have more principled way to diagnose
        # # Infer student misunderstanding or struggles
        # missing_knowledge = set(env_info) - set(student_beliefs.values())
        # ineffective_policy = "unknown key-door relation" not in student_policy
        # return missing_knowledge, ineffective_policy
        
        student_experience = student.experiences
        
    def abstraction(self, student, env_info, task_id):
        # Diagnose the student's state
        belief, desire, intention, missing_knowledge, ineffective_policy = self.diagnose_student(student, env_info)
        
        # Retrieve the optimal symbolic program from RAG
        optimal_program = self.retrieve_program(task_id, 'factual')  # Start with factual, adjust as needed
        
        # Determine what the student may know and what they need to learn
        known_goals = [goal for goal in self.hierarchical_RAG[task_id]['goal'] if goal in student_beliefs]
        unknown_goals = [goal for goal in self.hierarchical_RAG[task_id]['goal'] if goal not in student_beliefs]
        
        return {
            "missing_knowledge": missing_knowledge,
            "ineffective_policy": ineffective_policy,
            "optimal_program": optimal_program,
            "known_goals": known_goals,
            "unknown_goals": unknown_goals
        }
        
    def self_reasoning(self, diagnosis, student_outcome):
        # Determine the abstraction level based on the student's cognitive state
        abstraction = 'policy'  # Default to policy
        if student_outcome['memory_overload']:
            abstraction = 'goal'
        elif student_outcome['computation_overload']:
            abstraction = 'factual'
        
        # Decide key information to communicate
        key_info = {
            "abstraction": abstraction,
            "missing_knowledge": diagnosis['missing_knowledge'],
            "ineffective_policy": diagnosis['ineffective_policy'],
            "unknown_goals": diagnosis['unknown_goals']
        }
        
        return key_info

    def generate_explanation(self, task_id, missing_knowledge, ineffective_policy, stage='middle'):
        abstraction = self.self_reasoning()
        symbolic_program = self.retrieve_program(task_id, abstraction)

        if symbolic_program is None:
            explanation = f"Currently no information available at {abstraction} level for this task."
        else:
            explanation = self.symbolic_to_natural(symbolic_program, abstraction=abstraction)

        prompt_meta = f"""
        Refine the explanation based on student's missing knowledge: {missing_knowledge},
        and ineffective policy detected: {ineffective_policy}. Stage: {stage}.

        Original Explanation:
        "{explanation}"

        Provide a refined explanation:
        """
        response = openai.ChatCompletion.create(
            model='gpt-4-turbo',
            messages=[{"role": "system", "content": prompt_meta}]
        )
        return response.choices[0].message.content

    def provide_feedback(self, student_outcome, task_id, optimal_symbolic_solution):
        self.student_history.append(student_outcome)
        self.update_RAG(task_id, optimal_symbolic_solution)

    def pretrain_teacher_world_rag(env_loader, num_tasks=100):
        TeacherWorldRAG = {}
        for task_id in range(num_tasks):
            env = env_loader(task_id)
            symbolic_solution = symbolic_solution(env)  # Pathfinding solution
            
            factual = symbolic_solution
            goal = extract_goals(symbolic_solution)  # clustering method
            policy = abstract_policies(symbolic_solution)  # LLM-based or rules

            TeacherWorldRAG[f"task_{task_id:03d}"] = {
                "factual": factual,
                "goal": goal,
                "policy": policy
            }
        return TeacherWorldRAG

    def update_student_rag(student_id, student_rag, feedback):
        if student_id not in student_rag:
            student_rag[student_id] = {
                "known_cells": set(),
                "policies_understood": [],
                "recent_difficulties": [],
                "explanations_given": []
            }
        student_rag[student_id]["known_cells"].update(feedback["new_knowledge"])
        student_rag[student_id]["policies_understood"].extend(feedback["effective_policies"])
        student_rag[student_id]["recent_difficulties"].extend(feedback["struggles"])
        student_rag[student_id]["explanations_given"].append(feedback["explanation"])



    # From SageAgent
    def generate_response(self, student_model, env, reasoning, current_solution, prefill=None):
        if prefill is None:
            prefill = self.llm_client.support_prefill
        logger.info("Teacher generating response")

        # TODO        
        # # Perform abstraction
        # diagnosis = self.abstraction(student_model.beliefs, student_model.policy, env.info, env.task_id)
        
        # # Perform self-reasoning
        # key_info = self.self_reasoning(diagnosis, student_model.outcome)
        
        teacher_prompt = self.prompt_template.format(
            key="teacher",
            task_textual_description=env.render('text'),
            student_experience=student_model.experiences if student_model.experiences else "No experience yet"
        )
        
        messages = [
            {"role": "system", "content": ""},
            {"role": "user", "content": teacher_prompt}
        ]
        if prefill:
            messages.append({"role": "assistant", "content": "<solved>"}) # prefix-filling 
        
        response = self.llm_client.generate_response(messages)
        if prefill:
            response = "<solved>" + response
        try:
            parsed_response = extract_and_parse_markup(response)
            
            # Print each section with proper formatting
            for key in parsed_response.keys():
                print(f"\n=== {key} ===")
                # Parse the JSON string and format it nicely
                try:
                    content = json.loads(parsed_response[key])
                    print(json.dumps(content, indent=2))
                except:
                    # If it's not JSON, print the raw string
                    print(parsed_response[key])
            import ipdb; ipdb.set_trace()
            return parsed_response
        except json.JSONDecodeError:
            logger.error("Error: Sage's response was not in valid JSON format. Returning raw response.")
            return response
