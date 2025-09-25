import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

# --- 2. CHARGEMENT DU MODÈLE ET DU TOKENIZER ---
model_id = "codellama/CodeLlama-7b-Instruct-hf"

print(f"Chargement du tokenizer pour {model_id}...")
tokenizer = AutoTokenizer.from_pretrained(model_id)

print("Chargement du modèle avec la configuration 4-bit correcte...")
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=quantization_config,
    device_map="cpu" 
)
print("Modèle chargé avec succès.")

code_a_documenter = """
def traiter_donnees(liste_utilisateurs, seuil_age):
    resultats = []
    for utilisateur in liste_utilisateurs:
        if utilisateur['age'] > seuil_age and utilisateur['actif']:
            nom_majuscule = utilisateur['nom'].upper()
            resultats.append(nom_majuscule)
    return sorted(resultats)
"""


print("\n--- Code à documenter ---")
print(code_a_documenter)
print("------------------------")

instruction = "Rédige une docstring claire et concise au format Google pour la fonction Python suivante :"
formatted_prompt = f"<s>[INST] {instruction}\n\n```python\n{code_a_documenter}\n``` [/INST]\nVoici la docstring :\n```python\n"


print("\nGénération de la documentation en cours (cela peut prendre plusieurs minutes)...")
inputs = tokenizer(formatted_prompt, return_tensors="pt").to(model.device)

output = model.generate(
    **inputs,
    max_new_tokens=150,
    temperature=0.2,
    do_sample=True
)

response_tokens = output[0][inputs.input_ids.shape[-1]:]
response_text = tokenizer.decode(response_tokens, skip_special_tokens=True)

# --- 6. AFFICHAGE DU RÉSULTAT ---
print("\n✅ --- Documentation Générée --- ✅")
final_output = f'{code_a_documenter.strip()}\n    """{response_text.strip()}"""'
print(final_output)