function getContentValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function setText(element, value) {
  if (typeof value === "string" && value.trim()) {
    element.textContent = value;
  } else if (element.closest("[data-hide-if-empty]")) {
    element.textContent = "";
  }
}

function updateEmptyContent(root) {
  const contentSelector = "[data-content], [data-authority-contact], [data-doctor-name], [data-doctor-specialty], [data-doctor-education], [data-doctor-experience], [data-doctor-schedule], [data-doctor-qualification]";
  root.querySelectorAll("[data-hide-if-empty]").forEach((container) => {
    const fields = [...container.querySelectorAll(contentSelector)];
    if (container.matches(contentSelector)) fields.unshift(container);
    container.hidden = !fields.some((field) => field.textContent.trim());
  });
}

async function loadClinicContent() {
  try {
    const response = await fetch("content.json");
    if (!response.ok) return;

    const content = await response.json();

    document.querySelectorAll("[data-content]").forEach((element) => {
      setText(element, getContentValue(content, element.dataset.content));
    });

    document.querySelectorAll("[data-image-src]").forEach((element) => {
      const source = getContentValue(content, element.dataset.imageSrc);
      if (typeof source === "string" && source.startsWith("public/img/")) element.src = source;
    });

    const servicesList = document.querySelector("[data-services-list]");
    if (servicesList && Array.isArray(content.services)) {
      servicesList.replaceChildren(...content.services.map((service) => {
        const item = document.createElement("li");
        item.className = "service-row";
        const name = document.createElement("span");
        name.className = "service-row__name";
        setText(name, service.name);
        const detail = document.createElement("span");
        detail.className = "service-row__detail";
        const price = typeof service.price === "number"
          ? `${new Intl.NumberFormat("ru-RU").format(service.price)} ₽`
          : service.price;
        const priceLabel = price === null || price === undefined || price === "" ? null : `Цена: ${price}`;
        setText(detail, [service.detail, priceLabel].filter(Boolean).join(" · "));
        item.append(name, detail);
        return item;
      }));
    }

    const documentsList = document.querySelector(".organization-document-list");
    if (documentsList && Array.isArray(content.documents)) {
      documentsList.replaceChildren(...content.documents.map((name) => {
        const item = document.createElement("li");
        setText(item, name);
        return item;
      }));
    }

    document.querySelectorAll("[data-authority-name]").forEach((element) => {
      setText(element, content.authorities?.[Number(element.dataset.authorityName)]?.name);
    });
    document.querySelectorAll("[data-authority-contact]").forEach((element) => {
      setText(element, content.authorities?.[Number(element.dataset.authorityContact)]?.contact);
    });

    const doctorsList = document.querySelector("[data-doctor-list]");
    const doctorTemplate = document.querySelector("#doctor-card-template");
    const doctorsEmpty = document.querySelector("[data-doctors-empty]");
    if (doctorsList && doctorTemplate && Array.isArray(content.doctors)) {
      doctorsList.replaceChildren(...content.doctors.map((doctor) => {
        const card = doctorTemplate.content.firstElementChild.cloneNode(true);
        Object.entries({
          "[data-doctor-name]": doctor.name,
          "[data-doctor-specialty]": doctor.specialty,
          "[data-doctor-education]": doctor.education,
          "[data-doctor-experience]": doctor.experience,
          "[data-doctor-schedule]": doctor.schedule,
          "[data-doctor-qualification]": doctor.qualification,
        }).forEach(([selector, value]) => setText(card.querySelector(selector), value ?? ""));
        updateEmptyContent(card);
        if (typeof doctor.photo === "string" && doctor.photo.startsWith("public/img/")) {
          const photo = document.createElement("img");
          photo.className = "doctor-data-card__image";
          photo.src = doctor.photo;
          photo.alt = `Фото: ${doctor.name || "медицинский работник"}`;
          card.prepend(photo);
        }
        return card;
      }));
      if (doctorsEmpty) doctorsEmpty.hidden = content.doctors.length > 0;
    }

    updateEmptyContent(document);
  } catch {
    return;
  }
}

loadClinicContent();

const specialAccessStylesheet = document.createElement("link");
specialAccessStylesheet.rel = "stylesheet";
specialAccessStylesheet.href = "https://lidrekon.ru/slep/css/special.min.css";
document.head.append(specialAccessStylesheet);

const menuToggle = document.querySelector(".menu-toggle");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");

if (menuToggle && siteHeader && siteNav) {
  const setMenuOpen = (isOpen) => {
    siteHeader.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  window.matchMedia("(min-width: 1021px)").addEventListener("change", (event) => {
    if (event.matches) setMenuOpen(false);
  });
}

const appointmentDialog = document.querySelector("#appointment-dialog");
const appointmentOpenButton = document.querySelector("[data-appointment-open]");
const appointmentCloseButton = document.querySelector("[data-appointment-close]");

if (appointmentDialog && appointmentOpenButton && appointmentCloseButton) {
  appointmentOpenButton.addEventListener("click", () => appointmentDialog.showModal());
  appointmentCloseButton.addEventListener("click", () => appointmentDialog.close());

  appointmentDialog.addEventListener("click", (event) => {
    if (event.target === appointmentDialog) appointmentDialog.close();
  });
}

const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-review-slider]").forEach((slider) => {
  const track = slider.querySelector("[data-review-track]");
  const card = track?.querySelector(".review-card");
  if (!track || !card) return;

  const scrollByCard = (direction) => {
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: motionAllowed ? "smooth" : "instant" });
  };

  slider.querySelector("[data-review-prev]")?.addEventListener("click", () => scrollByCard(-1));
  slider.querySelector("[data-review-next]")?.addEventListener("click", () => scrollByCard(1));
});

if (motionAllowed && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  const heroIntro = document.querySelector(".hero-quote, .hero__intro");
  const heroImage = document.querySelector(".photo-placeholder--hero");

  if (heroIntro) {
    gsap.from(heroIntro, {
      y: 16,
      autoAlpha: 0,
      duration: 0.68,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
    });
  }

  if (heroImage) {
    gsap.from(heroImage, {
      y: 12,
      autoAlpha: 0,
      duration: 0.78,
      delay: 0.1,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
    });
  }

  gsap.utils.toArray("[data-reveal]").forEach((element) => {
    gsap.from(element, {
      y: 24,
      autoAlpha: 0,
      duration: 0.7,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: {
        trigger: element,
        start: "top 88%",
        once: true,
      },
    });
  });

  const careSteps = gsap.utils.toArray("[data-care-step]");
  if (careSteps.length) {
    gsap.from(careSteps, {
      y: 18,
      autoAlpha: 0,
      scale: 0.98,
      duration: 0.7,
      stagger: 0.1,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: {
        trigger: ".care-route",
        start: "top 82%",
        once: true,
      },
    });
  }

  const faqItems = gsap.utils.toArray("[data-faq-reveal]");
  if (faqItems.length) {
    gsap.from(faqItems, {
      y: 18,
      autoAlpha: 0,
      duration: 0.55,
      stagger: 0.12,
      ease: "power2.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: {
        trigger: ".faq-list",
        start: "top 84%",
        once: true,
      },
    });

    faqItems.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        const answer = item.querySelector("p");
        if (!answer) return;
        gsap.killTweensOf(answer);
        gsap.fromTo(answer, {
          height: 0,
          autoAlpha: 0,
          y: -8,
          overflow: "hidden",
        }, {
          height: "auto",
          autoAlpha: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          clearProps: "height,opacity,transform,visibility,overflow",
        });
      });
    });
  }
}
