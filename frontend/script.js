const API_URL =
    "https://yc33qmalpf.execute-api.ap-south-1.amazonaws.com/locations";

const locations = {};

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
    locationGrid.innerHTML = Object.entries(locations)
        .map(([key, place]) => {
            const risk = riskSettings[place.risk];

            return `
                <article
                    class="location-card"
                    data-location="${key}"
                    tabindex="0"
                    role="button"
                    aria-label="View ${place.name} sample data"
                    aria-pressed="false"
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
        })
        .join("");
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

async function loadLocations() {
    locationGrid.textContent = "Loading sample location data...";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.locations)) {
            throw new Error("Unexpected API response format.");
        }

        data.locations.forEach(item => {
            const key = item.location.toLowerCase();

            locations[key] = {
                name: item.location,
                rainfall: item.rainfall_mm,
                waterLevel: item.water_level_cm,
                risk: item.risk,
                recommendation: item.recommendation
            };
        });

        renderLocationCards();

        const requestedLocation = select.value.toLowerCase();
        const initialLocation = locations[requestedLocation]
            ? requestedLocation
            : Object.keys(locations)[0];

        select.innerHTML = Object.entries(locations)
            .map(([key, place]) =>
                `<option value="${key}">${place.name}</option>`
            )
            .join("");

        select.value = initialLocation;
        updateDashboard(initialLocation);

    } catch (error) {
        console.error("Could not load FloodGuard API data:", error);
        locationGrid.textContent =
            "Unable to load data from AWS. Please check your connection.";
    }
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

loadLocations();
