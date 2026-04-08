import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

try:
    from app.services.evaluation import compute_classification_metrics
    from app.services.features import FeatureEngineer
    from app.services.preprocessing import preprocess_for_model
except ModuleNotFoundError:
    from services.evaluation import compute_classification_metrics
    from services.features import FeatureEngineer
    from services.preprocessing import preprocess_for_model


@dataclass
class ComplaintClassifierArtifacts:
    classifier: LogisticRegression
    feature_engineer: FeatureEngineer
    labels: list[str]
    metrics: dict[str, float]


def _dataset_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "complaint_dataset.csv"


def _load_dataset() -> list[dict[str, str]]:
    path = _dataset_path()
    if not path.exists():
        raise RuntimeError(f"Training dataset not found at {path}")

    with path.open("r", encoding="utf-8", newline="") as file_obj:
        rows = list(csv.DictReader(file_obj))

    if not rows:
        raise RuntimeError("Training dataset is empty")

    if "text" not in rows[0] or "label" not in rows[0]:
        raise RuntimeError("Dataset must contain columns: text, label")

    return rows


@lru_cache(maxsize=1)
def get_trained_classifier() -> ComplaintClassifierArtifacts:
    rows = _load_dataset()
    texts = [preprocess_for_model(str(row.get("text", ""))) for row in rows]
    labels = [str(row.get("label", "general")) for row in rows]

    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    feature_engineer = FeatureEngineer(max_features=1200)
    feature_engineer.fit(x_train)

    x_train_tfidf = feature_engineer.transform(x_train)["tfidf"]
    x_test_tfidf = feature_engineer.transform(x_test)["tfidf"]

    classifier = LogisticRegression(max_iter=500)
    classifier.fit(x_train_tfidf, y_train)

    y_pred = classifier.predict(x_test_tfidf)
    metrics = compute_classification_metrics(y_test, y_pred)

    known_labels = sorted(set(labels))
    return ComplaintClassifierArtifacts(
        classifier=classifier,
        feature_engineer=feature_engineer,
        labels=known_labels,
        metrics=metrics,
    )


def predict_complaint_type(text: str) -> str:
    prediction, _ = predict_with_confidence(text)
    return prediction


def predict_with_confidence(text: str) -> tuple[str, float]:
    if not text or not text.strip():
        return "general", 0.0

    artifacts = get_trained_classifier()
    processed = preprocess_for_model(text)
    vector = artifacts.feature_engineer.transform([processed])["tfidf"]

    probabilities = artifacts.classifier.predict_proba(vector)[0]
    best_index = int(probabilities.argmax())

    prediction = artifacts.classifier.classes_[best_index]
    confidence = float(probabilities[best_index])

    if confidence < 0.3:
        return "general", confidence
    return str(prediction), confidence


def get_classifier_metrics() -> dict[str, float]:
    artifacts = get_trained_classifier()
    return artifacts.metrics
