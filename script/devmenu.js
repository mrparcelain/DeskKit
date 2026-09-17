function opendevmenu() {
    document.getElementById('devmenu').style.display = "block";
 }

function closedevmenu() {
    document.getElementById('devmenu').style.display = "none";
}

function createnewartist() {

    let artistname = document.getElementById("artistname").value; // Get the value from the input box
    let artistcover = document.getElementById("artistcover").value; // Get the value from the input box
    
    // Check if the input is not empty
    if (artistname.trim() !== "" && artistcover.trim() !== "") {
        // Create a new div element
        const newDiv = document.createElement('div');
        newDiv.className = 'sortedartistbutton'; // Add class for styling

        // Create a new span element
        const newImg = document.createElement('img');
        newImg.src = artistcover; // Set the src of the image to the input value
        const newSpan = document.createElement('span');
        newSpan.textContent = artistname; // Set the text of the span to the input value
        newSpan.id = 'artist_name'; // Set the ID of the span to "artist_name"
        newImg.setAttribute("src", `${artistcover}`); // Set the link input to the src value of the image

        // Append the span to the new div
        newDiv.appendChild(newImg);
        newDiv.appendChild(newSpan);

        // Append the new div to the container
        document.getElementById('sortedartistslist').appendChild(newDiv);


        // Clear the input field after creating the div
        document.getElementById('artistname').value = "";
        document.getElementById('artistcover').value = "";
    } else {
        alert("Please enter some text!"); // Alert if the input is empty
    }

        const container = document.getElementById('sortedartistslist');
        const divsArray = Array.from(container.children); // Convert HTMLCollection to Array
    
        divsArray.sort((a, b) => {
            const textA = a.querySelector('span').textContent.toLowerCase();
            const textB = b.querySelector('span').textContent.toLowerCase();
            return textA.localeCompare(textB); // Compare text of spans
        });
    
        // Remove all divs from the container
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    
        // Append the sorted divs back to the container
        divsArray.forEach(div => container.appendChild(div));
        
        // Check if a file is selected
        if (file) {
            const reader = new FileReader(); // Create a FileReader object

            reader.onload = function(event) {
                // Create a new image element
                const artistcoverurl = document.getElementById('artistcover').value;
                const newImage = document.createElement('img');                
                newImage.src = artistcoverurl;

                // Append the image to the new div
                newDiv.appendChild(newImage);

                // Append the new div to the container
                document.getElementById('sortedartistslist').appendChild(newDiv);
                };

                fileInput.value = ""; // Clear the file input after creating the div
            } else {
                alert("Please select an image file!"); // Alert if no file is selected
            }

        if (event.key === "Enter") {
            // Cancel the default action, if needed
            event.preventDefault();
            // Trigger the button element with a click
            document.getElementById("buttonnewartist").click();
        }
};
