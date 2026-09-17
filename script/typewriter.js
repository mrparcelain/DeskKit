var container = document.querySelector(".textbox");
if (container) {

var speeds = {
   pause: 500, //Higher number = longer delay
   slow: 120,
   normal: 70,
   fast: 40,
   superFast: 10
};

var textLines = [
   { speed: speeds.slow, string: "Hello!" },
   { speed: speeds.pause, string: "", pause: true },
   { speed: speeds.normal, string: "My name is Foldy." },
   { speed: speeds.normal, string: "Click any folder you would like to choose from." },
];

var timeDelay = 1;

var characters = [];
textLines.forEach((line, index) => {
   if (index < textLines.length - 1) {
      line.string += " "; //Add a space between lines
   }

   line.string.split("").forEach((character) => {
      var span = document.createElement("span");
      span.textContent = character;
      container.appendChild(span);
      characters.push({
         span: span,
         isSpace: character === " " && !line.pause,
         delayAfter: line.speed,
         classes: line.classes || []
      });
   });
});

function revealOneCharacter(list) {
   var next = list.splice(0, 1)[0];
   next.span.classList.add("revealed");
   next.classes.forEach((c) => {
      next.span.classList.add(c);
   });
   var delay = next.isSpace && !next.pause ? 0 : next.delayAfter;

   if (list.length > 0) {
      setTimeout(function () {
         revealOneCharacter(list);
      }, delay);
   }
}

setTimeout((timeDelay) => {
   revealOneCharacter(characters);   
}, 200)


}
