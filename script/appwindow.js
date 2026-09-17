// DRAGGABLE WINDOWS
var draggableElements = document.getElementsByClassName("draggable");

for (var i = 0; i < draggableElements.length; i++) {
  const el = draggableElements[i];
  // find the header inside el by ID ending with 'header'
  const header = el.querySelector('[id$="header"]');

  if (header) {
    dragElement(el, header);
  } else {
    // fallback: if no header found, drag whole element (optional)
    dragElement(el);
  }
}
function dragElement(elmnt, handle) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  handle = handle || elmnt; // default to entire element if no handle

  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    return false;
  }

  function elementDrag(e) {
    e = e || window.event;
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// OPEN AND CLOSE APPS
// Show the specified div
function openApp(divId) {
  const divToShow = document.getElementById(divId);
  if (divToShow) {
    divToShow.classList.remove("hidden");
    // Bring it to front when opened
    switchFocus(divToShow);
  }
}

// Hide the specified div
function closeApp(divId) {
  const divToHide = document.getElementById(divId);
  if (divToHide) {
    divToHide.classList.add("hidden");
  }
}