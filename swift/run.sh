#!/bin/bash
# CUDA_VISIBLE_DEVICES=0 python eval_agent_fast_slow.py \
#     --task_nums "28" \
#     --set "test_mini" \
#     --seed 42 \
#     --debug_var "450" \
#     --gpt_version "gpt-4" \
#     --output_path "fast_slow_logs/tmp_gpt4/"
# # you can then check `fast_slow_logs/tmp/task28.log` for the progress.


export TOGETHER_API_KEY="e4117bf3fa88d8ec66be81dc31864258c34dfc83466ebe6f447722df24256977"
export STUDENT_MODEL_ID="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"
export TEACHER_MODEL_ID="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
export PROMPT_TEMPLATE_DIR="/mnt/lustre/work/wu/wkn601/absexpl_data/swift_prompt_templates"
export ENGINE="Together"
python run_toy.py --api_provider ${ENGINE} \
          --student_model_id ${STUDENT_MODEL_ID} \
          --teacher_model_id ${TEACHER_MODEL_ID} \
          --prompt_template_dir ${PROMPT_TEMPLATE_DIR}