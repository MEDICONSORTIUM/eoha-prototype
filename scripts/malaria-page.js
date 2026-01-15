const countryObject = {
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
  const citySel = document.getElementById("city-select"); // You used an ID for city

  // Populate Country Dropdown
  for (let country in countryObject) {
    countrySel.options[countrySel.options.length] = new Option(country, country);
  }

  // when we change country
  countrySel.onchange = function() {
    provinceSel.length = 1; 
    provinceSel.selectedIndex = 0;

    citySel.length = 1;
    citySel.selectedIndex = 0;
    citySel.disabled = true;

    if (this.value === "") {
        provinceSel.disabled = true;
        return;
    }

    provinceSel.disabled = false;
    for (let province in countryObject[this.value]) {
      provinceSel.options[provinceSel.options.length] = new Option(province, province);
    }
  };

  // when we change province
  provinceSel.onchange = function() {
    citySel.length = 1;

    if (this.value === "") {
        citySel.disabled = true;
        return;
    }

    citySel.disabled = false;
    
    const selectedCity = countryObject[countrySel.value][this.value];
    citySel.options[citySel.options.length] = new Option(selectedCity, selectedCity);
  };
};