import json
import sys

queue_length = max(0.0, float(sys.argv[1]))
hour_of_day = min(23.0, max(0.0, float(sys.argv[2])))
day_of_week = min(6.0, max(0.0, float(sys.argv[3])))

try:
    import torch
    from torch import nn

    torch.manual_seed(42)
    model = nn.Sequential(nn.Linear(3, 8), nn.ReLU(), nn.Linear(8, 1), nn.Sigmoid())
    with torch.no_grad():
        # Normalize operational inputs before inference.
        inputs = torch.tensor([[min(queue_length, 100.0) / 100.0, hour_of_day / 23.0, day_of_week / 6.0]], dtype=torch.float32)
        raw = float(model(inputs).item())
    # Blend model output with a stability prior so an untrained demo model stays interpretable.
    confidence = 65.0 + (raw * 30.0) - min(queue_length, 60.0) * 0.12
    source = "pytorch-nn-sequential"
except Exception:
    rush_penalty = 7.0 if 8 <= hour_of_day <= 11 or 16 <= hour_of_day <= 19 else 2.0
    weekend_penalty = 3.0 if day_of_week in (0, 6) else 0.0
    confidence = 93.0 - min(queue_length, 60.0) * 0.35 - rush_penalty - weekend_penalty
    source = "python-deterministic-fallback"

print(json.dumps({"confidenceScore": round(max(50.0, min(99.0, confidence)), 2), "source": source}))
