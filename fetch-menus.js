// SODEXO_API_KEY is a public key from the Sodexo website and can be hardcoded.
const SODEXO_API_KEY = '68717828-b754-420d-9488-4c37cb7d7ef7';

// shorthand and display names for each supported dining hall
const DISPLAY_NAMES = {
	barh: 'BARH Dining Hall',
	commons: 'The Commons Dining Hall',
	blitman: 'Blitman Dining Hall',
	sage: 'Russell Sage Dining Hall'
};

const MENU_URLS = {
	barh: 'https://api-prd.sodexomyway.net/v0.2/data/menu/76929003/153626',
	commons: 'https://api-prd.sodexomyway.net/v0.2/data/menu/76929001/153148',
	blitman: 'https://api-prd.sodexomyway.net/v0.2/data/menu/76929015/153702',
	sage: 'https://api-prd.sodexomyway.net/v0.2/data/menu/76929002/153157'
};

let menuCache = {};
let cacheDate = null;

// gets YYYY-MM-DD format of current date for Sodexo API request
function getTodaysDate() {
	const d = new Date();
	
	// month returns a number 0-11, padStart adds a leading 0 if needed
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return "" + d.getFullYear() + "-" + month + "-" + day;
}

async function fetchMenu(hall) {
	const url = `${MENU_URLS[hall]}?date=${getTodaysDate()}`;

	const response = await fetch(url, {
		"headers": {
			"accept": "*/*",
			"accept-language": "en-US,en;q=0.5",
			"api-key": SODEXO_API_KEY,
			"authorization": "Bearer",
			"content-type": "application/json",
			"priority": "u=1, i",
			"sec-ch-ua": "\"Chromium\";v=\"142\", \"Brave\";v=\"142\", \"Not_A Brand\";v=\"99\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Linux\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "cross-site",
			"sec-gpc": "1",
			"Referer": "https://rpi.sodexomyway.com/"
  		}, 
		"body": null, 
		"method": "GET" 
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch ${DISPLAY_NAMES[hall]}'s menu: ${response.status}`);
	}

	return await response.json();
}

// runs fetchMenu for all four dining halls to build the JSON cache
async function updateMenus() {
	console.log('Fetching today\'s menu data...');
	const today = getTodaysDate();

	for (const hall of Object.keys(MENU_URLS)) {
		try {
			menuCache[hall] = await fetchMenu(hall);
			console.log(`Successfully fetched menu for ${DISPLAY_NAMES[hall]}.`);
		} catch(error) {
			console.error(`Unable to get today's menu for ${DISPLAY_NAMES[hall]}.`);
			console.error(error); // show the full error output
			menuCache[hall] = { error: true, message: error.message };
		}
	}

	cacheDate = today;
	console.log('Successfully updated menu cache for all halls.');
}

function getMenu(hall, meal, vegetarianOnly = false) {
	// check if cacheDate is prior to today's date
	if (cacheDate !== getTodaysDate()) {
		throw new Error('CACHE_STALE');
	}
	
	if (menuCache[hall].error) { return null; }

	const data = menuCache[hall];

	const mealData = data.find(m => m.name === meal);
	if (!mealData) { return null; }

	const result = {
		hall: DISPLAY_NAMES[hall],
		meal: meal,
		groups: []
	}

	for (const group of mealData.groups) {
		const groupResult = {
			name: group.name,
			items: []
		};

		for (const item of group.items) {
      			if (vegetarianOnly && !item.isVegetarian) { continue; }
      			groupResult.items.push({
        			name: item.formalName,
        			description: item.description
      			});
    		}

    		result.groups.push(groupResult);
  	}

	return result;
}

function getAvailableMeals(hall) {
  	if (menuCache[hall].error) { return []; }
  
  	const data = menuCache[hall];
  	return data.map(meal => meal.name);
}

module.exports = {
  	updateMenus,
  	getMenu,
  	getAvailableMeals,
  	DINING_HALLS: Object.keys(MENU_URLS),
  	DISPLAY_NAMES
};

/* Test code
updateMenus().then(() => {
  const menu = getMenu('commons', 'Lunch', false);
  console.log(JSON.stringify(menu, null, 2));
});
*/
