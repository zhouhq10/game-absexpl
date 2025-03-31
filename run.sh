#!/bin/bash
CUDA_VISIBLE_DEVICES=0 python eval_agent_fast_slow.py \
    --task_nums "28" \
    --set "test_mini" \
    --seed 42 \
    --debug_var "450" \
    --gpt_version "gpt-4" \
    --output_path "fast_slow_logs/tmp_gpt4/"
# you can then check `fast_slow_logs/tmp/task28.log` for the progress.