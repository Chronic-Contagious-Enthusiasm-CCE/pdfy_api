## Export to pdf service based on puppeteer
A one file API for creating pdfs from web pages. It uses a chrome browser emulator and its print function to return unform pdf version of the web pages respecting printing-specific styling.


**run with**
```
npm start
```

### Example request:
URL: `/render`
```json
{
	"url": "https://www.google.com",
	"landscape": true, // optional, default: false
	"format": "A3", // optional, default: A4
	"headers": {   // optional, default: {}
		"subdomain.domain.com": {
			"Authorization": "Bearer testtoken"
		}
	}
}
```
