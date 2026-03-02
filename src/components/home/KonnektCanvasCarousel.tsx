import { useRef, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

const CANVAS_SLIDES = [
  { src: "/images/konnekt-canvas-1.png", alt: "Vos colis livrés avec soin — Konnekt Transport" },
  { src: "/images/konnekt-canvas-2.png", alt: "Transport aérien express — Konnekt Cargo" },
  { src: "/images/konnekt-canvas-3.png", alt: "Fret maritime sécurisé — Konnekt Maritime" },
  { src: "/images/konnekt-canvas-4.png", alt: "Livraison routière fiable — Konnekt Routier" },
];

export function KonnektCanvasCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();

    // Auto-scroll every 4s
    const interval = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => {
      clearInterval(interval);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="px-4 pb-4">
      <h2 className="text-base font-bold text-foreground mb-2">Découvrez Konnekt</h2>
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {CANVAS_SLIDES.map((slide, idx) => (
            <div key={idx} className="flex-[0_0_92%] min-w-0 mr-2.5">
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full aspect-[2.5/1] object-cover rounded-2xl"
                loading={idx === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {CANVAS_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
