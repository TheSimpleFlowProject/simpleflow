from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/deepseek-coder-1.3b-instruct", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("deepseek-ai/deepseek-coder-1.3b-instruct", trust_remote_code=True).to("cpu")
messages=[
    { 'role': 'user', 'content': "ONLY return the DOXYGEN COMMENT (WITHOUT ANY WARNINGS, NOTES, ETC.) for the specified C++ function\nint say_hello(void) { std::cout << 'Hello' << endl; return 0; }"}
]
inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to("cpu")
outputs = model.generate(inputs, max_new_tokens=512, do_sample=False, top_k=50, top_p=0.95, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)
print(tokenizer.decode(outputs[0][len(inputs[0]):], skip_special_tokens=True))
print("---")
print(outputs)