const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px",
  },
);

document.querySelectorAll(".reveal").forEach((element) => {
  observer.observe(element);
});

const pulseText = document.querySelector("[data-rotate]");

if (pulseText instanceof HTMLElement) {
  const phrases = pulseText.dataset.rotate
    ?.split("|")
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  if (!reduceMotion && phrases && phrases.length > 1) {
    let currentIndex = 0;

    window.setInterval(() => {
      currentIndex = (currentIndex + 1) % phrases.length;
      pulseText.classList.add("is-switching");

      window.setTimeout(() => {
        pulseText.textContent = phrases[currentIndex];
        pulseText.classList.remove("is-switching");
      }, 180);
    }, 2600);
  }
}
