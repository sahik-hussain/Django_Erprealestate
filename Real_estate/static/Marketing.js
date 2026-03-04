
    /* Toggle the dropdown visibility */
    function toggleDropdown() {
        document.getElementById("yearDropdown").classList.toggle("show");
    }

    /* Update text when a year is clicked */
    function selectYear(year) {
        document.getElementById("currentYear").innerText = year;
        // Close dropdown after selection
        document.getElementById("yearDropdown").classList.remove("show");
    }

    /* Close the dropdown if the user clicks outside of it */
    window.onclick = function(event) {
        if (!event.target.closest('.year-btn')) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (var i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    }
