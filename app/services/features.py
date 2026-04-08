from dataclasses import dataclass

from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer


@dataclass
class FeatureBundle:
    bow_vectorizer: CountVectorizer
    tfidf_vectorizer: TfidfVectorizer
    bow_matrix: object
    tfidf_matrix: object


class FeatureEngineer:
    def __init__(self, max_features: int = 1000) -> None:
        self.bow_vectorizer = CountVectorizer(max_features=max_features)
        self.tfidf_vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=(1, 2))

    def fit(self, corpus: list[str]) -> FeatureBundle:
        bow_matrix = self.bow_vectorizer.fit_transform(corpus)
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(corpus)
        return FeatureBundle(
            bow_vectorizer=self.bow_vectorizer,
            tfidf_vectorizer=self.tfidf_vectorizer,
            bow_matrix=bow_matrix,
            tfidf_matrix=tfidf_matrix,
        )

    def transform(self, texts: list[str]) -> dict[str, object]:
        return {
            "bow": self.bow_vectorizer.transform(texts),
            "tfidf": self.tfidf_vectorizer.transform(texts),
        }


def build_feature_bundle(corpus: list[str], max_features: int = 1000) -> FeatureBundle:
    engineer = FeatureEngineer(max_features=max_features)
    return engineer.fit(corpus)
