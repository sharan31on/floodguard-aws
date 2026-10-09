const locations = {
trichy: {
name: "Trichy",
rainfall: 85,
waterLevel: 70,
risk: "HIGH",
recommendation:
"Avoid low-lying roads and check local official advisories."
},
thanjavur: {
name: "Thanjavur",
rainfall: 45,
waterLevel: 38,
risk: "WARNING",
recommendation:
"Be cautious around low-lying areas and monitor local updates."
},
salem: {
name: "Salem",
rainfall: 15,
waterLevel: 20,
risk: "SAFE",
recommendation:
"The sample indicators show lower risk. Continue to follow local advisories."
}
};

const riskSettings = {
HIGH: {
className: "high",
panelClass: "",
symbol: "!",
label: "HIGH RISK"
},
WARNING: {
className: "warning",
panelClass: "warning",
symbol: "!",
label: "WARNING"
},
SAFE: {
className: "safe",
panelClass: "safe",
symbol: "✓",
label: "LOW RISK"
}
};

const select = document.getElementById("location-select");
const riskPanel = document.getElementById("risk-panel");
const locationGrid = document.getElementById("location-grid");

function renderLocationCards() {
locationGrid.innerHTML = Object.entries(locations).map(([key, place]) => {
const risk = riskSettings[place.risk];

    return `
        <article
            class="location-card"
            data-location="${key}"
            tabindex="0"
            role="button"
            aria-label="View ${place.name} demo data"
        >
            <div class="card-top">
                <h3>${place.name}</h3>
                <span class="risk-tag ${risk.className}">
                    ${place.risk}
                </span>
            </div>

            <p class="card-measurement">
                Rainfall<br>
                <strong>${place.rainfall} mm</strong>
            </p>

            <p class="card-measurement">
                Water level<br>
                <strong>${place.waterLevel} cm</strong>
            </p>
        </article>
    `;
}).join("");

}

function updateDashboard(locationKey) {
const place = locations[locationKey];

if (!place) return;

const risk = riskSettings[place.risk];

document.getElementById("risk-title").textContent = risk.label;
document.getElementById("risk-location").textContent =
    `${place.name}, Tamil Nadu`;

document.getElementById("risk-symbol").textContent = risk.symbol;
document.getElementById("rainfall").textContent = place.rainfall;
document.getElementById("water-level").textContent = place.waterLevel;
document.getElementById("recommendation").textContent =
    place.recommendation;

riskPanel.classList.remove("warning", "safe");
if (risk.panelClass) {
    riskPanel.classList.add(risk.panelClass);
}

document.querySelectorAll(".location-card").forEach(card => {
    const selected = card.dataset.location === locationKey;

    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
});

}

select.addEventListener("change", event => {
updateDashboard(event.target.value);
});

locationGrid.addEventListener("click", event => {
const card = event.target.closest(".location-card");

if (!card) return;

select.value = card.dataset.location;
updateDashboard(card.dataset.location);

});

locationGrid.addEventListener("keydown", event => {
if (event.key !== "Enter" && event.key !== " ") return;

const card = event.target.closest(".location-card");

if (!card) return;

event.preventDefault();
select.value = card.dataset.location;
updateDashboard(card.dataset.location);

});

renderLocationCards();
updateDashboard(select.value);