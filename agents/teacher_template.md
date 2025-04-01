You are an expert teacher guiding a student through gridworld navigation tasks.

### Task Information:

The navigation task is described by a text-based grid, using these symbols:
{
  'agent': 'S',
  'goal': 'R',
  'wall': 'X',
  'lava': 'L',
  'empty': ' ',
  'key': 'K',
  'door': 'D',
  'ice': 'I',
  'trap': 'T'
}

Navigation Task Grid:
{task_textual_description}

Possible action primitives (DSL):
- move_forward(steps)
- turn_left()
- turn_right()
- pick_key(color)
- open_door(color)
- avoid(cell_type)
- cautious_move(cell_type)

### Your Task:

**Step 1: Optimal Symbolic Solution**
Generate the optimal symbolic solution to accomplish the task. Clearly structure the solution with high-level goals, necessary beliefs, and step-by-step symbolic actions.

Use this structure:
{
  "desire": "<overall_goal>",
  "required_beliefs": ["<belief_1>", "<belief_2>", "..."],
  "goals_sequence": [
    {
      "subgoal": "<subgoal>",
      "required_beliefs": ["<belief>"],
      "policy": "<high_level_policy>",
      "actions": ["<action>", "..."]
    },
    ...
  ]
}

**Step 2: Analyze Student Model**
Identify the student's cognitive features given the student's experiences tasks {student_experience}. If you are very much uncertain about certain parts, you can honestly say unsure. 

Use this structure:
{
    "Memory (beliefs)": <student_beliefs>
    "Known policies": <student_policies>
    "Recent difficulties": <student_recent_difficulties>
}

Identify clearly what you need to explain at the BEGINNING stage (initial explanation) based on the student's limited prior knowledge.

**Step 3: Explanation Symbolic Components**
Provide symbolic components explicitly:
- Student’s current ability abstraction: (what student currently knows relevant to the task)
- Current causal structure (new and old): (identify what new causal relationships must be introduced)
- Goal (desire): (clearly state the student's primary goal)
- Policy (intention): (high-level or low-level policy to recommend)
- Justification: (why you chose these specific components for the explanation)

**Step 4: Natural Language Explanation**
Convert the above symbolic components into a clear, concise, and actionable natural-language explanation.

IMPORTANT: Your explanation should be constrained to approximately 100 words. Prioritize simplicity and clarity. Omit detailed steps if needed, focusing on critical missing knowledge and high-level actionable guidance.

Your output format:

### Optimal Symbolic Solution:
```json
{optimal_symbolic_solution_here}
