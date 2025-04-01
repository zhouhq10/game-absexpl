import json
import logging

import numpy as np

from agents import Agent

import openai
import numpy as np
logger = logging.getLogger("SwiftSage")


class StudentModel(Agent):
    def __init__(self, prompt_template, llm_client, memory_budget=5, compute_budget=5):
        super().__init__(prompt_template, llm_client)
        self.plans = {}
        self.codes = {}
        
        self.memory_budget = memory_budget
        self.compute_budget = compute_budget

        # Student's simplified RAG: {"knowledge": [], "policy": []}
        self.RAG = {"world_model": [], "policy": []}
        self.goal = "Reach goal safely"
        self.experiences = [] # Should be a list of disctionary with task_id, env, solution

    def symbolic_to_natural(self, symbolic_program):
        prompt = f"""
        Explain these symbolic instructions in simple natural language:
        {symbolic_program}
        """
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[{"role": "system", "content": prompt}]
        )
        return response.choices[0].message.content

    def natural_to_symbolic(self, explanation):
        prompt = f"""
        Convert this explanation into symbolic steps:
        "{explanation}"
        """
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[{"role": "system", "content": prompt}]
        )
        symbolic_program = response.choices[0].message.content
        return symbolic_program

    def generate_initial_policy(self, env):
        # Generate a simple policy based on the environment
        # This is a placeholder; you should implement a more sophisticated policy
        policy = []
        for _ in range(env.max_steps):
            policy.append("move_forward(1)")
        self.RAG["policy"] = policy
        return policy
    
    def perceive(self, observation):
        cell_pos = tuple(observation['agent_pos'])
        cell_type = observation['image'][cell_pos]
        knowledge_item = {"pos": cell_pos, "type": cell_type}

        # Memory-constrained knowledge update
        if len(self.RAG["knowledge"]) >= self.memory_budget:
            self.RAG["knowledge"].pop(0)
        self.RAG["knowledge"].append(knowledge_item)

    def deliberate(self):
        knowledge_summary = "; ".join([f"{k['type']} at {k['pos']}" for k in self.RAG["knowledge"]])
        policy_summary = "; ".join(self.RAG["policy"][-self.compute_budget:])

        prompt = f"""
        You want to '{self.desire}'.
        Current knowledge: {knowledge_summary}.
        Previous effective policies: {policy_summary if policy_summary else 'None'}.

        What is your next immediate action (in symbolic form)?
        Choose from: move_forward(steps), turn_left(), turn_right(), pick_key(color), open_door(color).
        """
        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[{"role": "system", "content": prompt}]
        )
        symbolic_action = response.choices[0].message.content.strip()
        return symbolic_action

    def update_policy(self, feedback_symbolic_steps):
        for step in feedback_symbolic_steps:
            if step not in self.RAG["policy"]:
                if len(self.RAG["policy"]) >= self.compute_budget:
                    self.RAG["policy"].pop(0)
                self.RAG["policy"].append(step)

    def receive_explanation(self, explanation):
        print("Teacher's explanation:", explanation)
        symbolic_feedback = self.natural_to_symbolic(explanation)
        feedback_steps = symbolic_feedback.split(';')  # assuming steps separated by ';'
        self.update_policy(feedback_steps)



    # From SwiftAgent
    def generate_response(self, prompt, reasoning, current_solution, plan, critical_feedback, prefill=None):
        if prefill is None:
            prefill = self.llm_client.support_prefill
        logger.info("SwiftAgent generating response")
        if self.retrieval_augmentation:
            query_embedding = self.get_query_embedding(prompt)
            similar_examples = self.retrieval_augmentation.get_similar_examples(query_embedding)
            examples_text = "\n".join(similar_examples) # TODO: add more context to the prompt
        else:
            examples_text = "No similar examples available."
        
        swift_prompt = self.prompt_template.format(
            "swift",
            prompt=prompt,
            current_reasoning=reasoning, # TODO: check if this is needed
            examples=examples_text,
            current_solution=current_solution,
            critical_feedback=critical_feedback,
            revised_plan=plan
        )
        
        messages = [
            {"role": "system", "content": ''},
            {"role": "user", "content": swift_prompt}
        ]
        if prefill:
            messages.append({"role": "assistant", "content": "<plan>"}) # prefix-filling 
        
        response = self.llm_client.generate_response(messages) 

        if prefill:
            response = "<plan>" + response
        
        try:
            parsed_response = extract_and_parse_markup(response)
            return parsed_response
        except json.JSONDecodeError:
            logger.error("Error: Swift's response was not in valid JSON format. Returning raw response.")
            return response

    def get_query_embedding(self, query):
        # Implement query embedding generation
        return np.random.rand(768)  # Placeholder, replace with actual embedding
 