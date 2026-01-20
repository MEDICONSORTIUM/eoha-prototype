// GSAP ScrambleTextPlugin Example
    gsap.registerPlugin(ScrambleTextPlugin);

    const blurbs = [
      "Scramble or unscramble text progressively.",
      "Use specific chars like 'XO' or use only numbers, UPPERCASE or lowercase.",
      "Even add a class to the new or old text."
    ];

    let curIndex = 0;

    document.querySelector("#next").addEventListener("click", () => {
      curIndex = (curIndex + 1) % blurbs.length;

      gsap.to(".text", {
        scrambleText: {
          text: blurbs[curIndex],
          chars: "upperAndLowerCase",
          revealDelay: 0.2,
          tweenLength: true,
          newClass: curIndex === 2 ? "border" : ""
        },
        ease: "power2.inOut",
        overwrite: "auto",
        duration: 4.2
      });
    });
  