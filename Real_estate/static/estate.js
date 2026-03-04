// etate.html script//
document.getElementById("dashboardLink").addEventListener("click", function () {
    window.location.href = "/index.html";
  });
  document.getElementById("TaskListLink").addEventListener("click", function () {
    window.location.href = "/task-list/";
  });
  document.getElementById("projectLink").addEventListener("click", function () {
    window.location.href = "/project/";
  });
  document.getElementById("crmhomeLink").addEventListener("click", function(){
    window.location.href = "/crmhome/";
  });
  document.getElementById("ReportLink").addEventListener("click", function(){
    window.location.href = "/report/";
  });

  // Modal functions
  function openOtherModal() {
    document.getElementById("otherModal").style.display = "flex";
  }

  function closeOtherModal() {
    document.getElementById("otherModal").style.display = "none";
  }

  // Close modal on clicking outside
  window.onclick = function(event) {
    const modal = document.getElementById("otherModal");
    if (event.target === modal) {
      closeOtherModal();
    }
  }

  
    document.addEventListener("DOMContentLoaded", function() {
      const addBtn = document.getElementById("addPropertyBtn");
      const modalContainer = document.querySelector("#otherModal .modal-layout");

      addBtn.addEventListener("click", function(e) {
        e.preventDefault(); // prevent page reload

        // Get values from form
        const type = document.getElementById("propertyType").value;
        const condition = document.getElementById("propertyCondition").value;
        const forWhat = document.getElementById("propertyFor").value;
        const loc1 = document.getElementById("location1").value;
        const loc2 = document.getElementById("location2").value;
        const city = document.getElementById("city").value;
        const state = document.getElementById("state").value;
        const zip = document.getElementById("zip").value;
        const country = document.getElementById("country").value;
        const date = document.getElementById("date").value;
        const area = document.getElementById("area").value;
        const member = document.getElementById("member").value;

        if (!type || !loc1 || !city) {
          alert("Please fill required fields!");
          return;
        }

        // Create new property card
        const card = document.createElement("div");
        card.className = "property-card";
        card.innerHTML = `
          <img src="/static/images/flat.jpg" alt="Property">
          <div class="card-info">
            <strong>${type}</strong>
            <p>${loc1}, ${loc2}, ${city}, ${state}, ${zip}, ${country}</p>
            <span class="${forWhat.toLowerCase()}">${forWhat}</span>
            <span class="new">${condition}</span>
          </div>
        `;

        // Append to modal
        modalContainer.appendChild(card);

        // Open the modal automatically
        document.getElementById("otherModal").style.display = "flex";

        // Reset the form
       document.getElementById("myForm").reset();

      });
    });




document.querySelectorAll(".property-card").forEach(card => {
  card.addEventListener("click", function () {

    document.querySelectorAll(".property-card")
      .forEach(c => c.classList.remove("active"));
    this.classList.add("active");

    // IMAGE + TITLE
    detailImg.src = this.dataset.img;
    detailTitle.innerText = this.dataset.title;
    detailAddress.innerText = this.dataset.location;

    // TABLE
    pType.innerText = this.dataset.type;
    pCondition.innerText = this.dataset.condition;
    pDate.innerText = this.dataset.date;
    pLocation.innerText = this.dataset.location;
    pCity.innerText = this.dataset.city;
    pArea.innerText = this.dataset.area;
    pLandmark.innerText = this.dataset.landmark;
  });
});

function openProjectModal(){
  document.getElementById("projectModal").style.display = "block";
}

function closeProjectModal(){
  document.getElementById("projectModal").style.display = "none";
}

// deals.html script//
function gocontact(){
  window.location.href = "contact.html";
}

document.getElementById("addPropertyBtn").onclick = function () {

  let type = document.getElementById("propertyType").value;

  openOtherModal(); // open modal

  let img = document.getElementById("detailImg");
  let title = document.getElementById("detailTitle");

  if (type === "shop") {
    img.src = "/static/images/shop.jpg";
    title.innerText = "Shop";
  }
  else if (type === "villa") {
    img.src = "/static/images/villa.jpg";
    title.innerText = "House / Villa";
  }
  else if (type === "land") {
    img.src = "/static/images/land.jpg";
    title.innerText = "Land";
  }
  else {
    img.src = "/static/images/flat.jpg";
    title.innerText = "Flat / Apartment";
  }
};
