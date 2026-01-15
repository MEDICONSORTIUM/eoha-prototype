// NCD Region Selector Script
const ncdRegionData = {
  "South Africa": {
    "Eastern Cape": "Bhisho",
    "Free State": "Bloemfontein",
    "Gauteng": "Johannesburg",
    "KwaZulu-Natal": "Pietermaritzburg",
    "Limpopo": "Polokwane",
    "Mpumalanga": "Mbombela",
    "North West": "Mahikeng",
    "Northern Cape": "Kimberley",
    "Western Cape": "Cape Town"
  },
  "Botswana": {
    "Central": "Serowe",
    "Chobe": "Kasane",
    "Francistown": "Francistown",
    "Gaborone": "Gaborone",
    "Ghanzi": "Ghanzi",
    "Jwaneng": "Jwaneng",
    "Kgalagadi": "Tsabong",
    "Kgatleng": "Mochudi",
    "Kweneng": "Molepolole",
    "Lobatse": "Lobatse",
    "Ngamiland": "Maun",
    "North-East": "Masunga",
    "Selebi-Phikwe": "Selebi-Phikwe",
    "South-East": "Ramotswa",
    "Southern": "Kanye",
    "Sowa": "Sowa Town"
  },
  "Zimbabwe": {
    "Bulawayo": "Bulawayo",
    "Harare": "Harare",
    "Manicaland": "Mutare",
    "Mashonaland Central": "Bindura",
    "Mashonaland East": "Marondera",
    "Mashonaland West": "Chinhoyi",
    "Masvingo": "Masvingo",
    "Matabeleland North": "Lupane",
    "Matabeleland South": "Gwanda",
    "Midlands": "Gweru"
  },
  "Lesotho": {
    "Berea": "Teyateyaneng",
    "Butha-Buthe": "Butha-Buthe",
    "Leribe": "Hlotse",
    "Mafeteng": "Mafeteng",
    "Maseru": "Maseru",
    "Mohale's Hoek": "Mohale's Hoek",
    "Mokhotlong": "Mokhotlong",
    "Qacha's Nek": "Qacha's Nek",
    "Quthing": "Moyeni",
    "Thaba-Tseka": "Thaba-Tseka"
  }
};

window.onload = function() {
  const countrySel = document.querySelector(".countries-select");
  const provinceSel = document.querySelector(".provinces-select");
  const citySel = document.getElementById("city-select");

  // Populate Country Dropdown
  for (let country in ncdRegionData) {
    countrySel.options[countrySel.options.length] = new Option(country, country);
  }

  // When country changes, populate provinces
  countrySel.onchange = function() {
    provinceSel.length = 1; // Keep placeholder
    provinceSel.selectedIndex = 0;

    citySel.length = 1; // Reset city dropdown
    citySel.selectedIndex = 0;
    citySel.disabled = true;

    if (this.value === "") {
      provinceSel.disabled = true;
      return;
    }

    provinceSel.disabled = false;
    for (let province in ncdRegionData[this.value]) {
      provinceSel.options[provinceSel.options.length] = new Option(province, province);
    }
  };

  // When province changes, populate city
  provinceSel.onchange = function() {
    citySel.length = 1; // Keep placeholder

    if (this.value === "") {
      citySel.disabled = true;
      return;
    }

    citySel.disabled = false;
    
    const selectedCity = ncdRegionData[countrySel.value][this.value];
    citySel.options[citySel.options.length] = new Option(selectedCity, selectedCity);
  };
};
