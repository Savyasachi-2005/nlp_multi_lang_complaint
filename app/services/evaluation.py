from sklearn.metrics import accuracy_score, precision_score, recall_score


def compute_classification_metrics(y_true: list[str], y_pred: list[str]) -> dict[str, float]:
    if not y_true:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0}

    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, average="macro", zero_division=0)
    recall = recall_score(y_true, y_pred, average="macro", zero_division=0)

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
    }
