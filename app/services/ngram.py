from collections import Counter, defaultdict

try:
    from app.services.preprocessing import preprocess_text
except ModuleNotFoundError:
    from services.preprocessing import preprocess_text


class AddOneNGramLanguageModel:
    def __init__(self, n: int = 2) -> None:
        if n < 2:
            raise ValueError("n must be at least 2")
        self.n = n
        self.context_counts: dict[tuple[str, ...], Counter[str]] = defaultdict(Counter)
        self.vocabulary: set[str] = set()

    def fit(self, corpus: list[str]) -> None:
        self.context_counts.clear()
        self.vocabulary.clear()

        for text in corpus:
            processed = preprocess_text(text)
            tokens = ["<s>"] * (self.n - 1) + processed.word_tokens + ["</s>"]
            self.vocabulary.update(processed.word_tokens)
            self.vocabulary.add("</s>")

            for idx in range(len(tokens) - self.n + 1):
                context = tuple(tokens[idx : idx + self.n - 1])
                next_word = tokens[idx + self.n - 1]
                self.context_counts[context][next_word] += 1

    def probability(self, context: tuple[str, ...], word: str) -> float:
        counts = self.context_counts.get(context, Counter())
        numerator = counts.get(word, 0) + 1
        denominator = sum(counts.values()) + max(len(self.vocabulary), 1)
        return numerator / denominator

    def suggest_next(self, context_tokens: list[str], top_k: int = 3) -> list[str]:
        if not self.vocabulary:
            return []

        context_size = self.n - 1
        context = tuple((context_tokens or ["<s>"])[-context_size:])
        if len(context) < context_size:
            context = tuple(["<s>"] * (context_size - len(context)) + list(context))

        scored = [
            (word, self.probability(context, word))
            for word in self.vocabulary
            if word != "<s>"
        ]
        scored.sort(key=lambda item: item[1], reverse=True)
        return [word for word, _ in scored[:top_k]]

    def complete_phrase(self, seed_text: str, max_words: int = 6) -> str:
        processed = preprocess_text(seed_text)
        generated = processed.word_tokens[:]

        for _ in range(max_words):
            next_candidates = self.suggest_next(generated, top_k=1)
            if not next_candidates:
                break

            next_word = next_candidates[0]
            if next_word == "</s>":
                break
            generated.append(next_word)

        return " ".join(generated).strip()
