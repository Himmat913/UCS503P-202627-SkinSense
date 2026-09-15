import torch
from services.inference import _try_load_acne_model, _acne_model
import services.inference as inf
result = inf._try_load_acne_model()
print('Load succeeded:', result)
print('Model object:', inf._acne_model)