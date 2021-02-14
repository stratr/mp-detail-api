/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const cheerio = require('cheerio')
const axios = require("axios")
require('dotenv').config()

const fetchData = async (siteUrl) => {
    const result = await axios.get(siteUrl);
    return cheerio.load(result.data);
};

const getTwitterList = () => {
    console.log(process.env.TWITTER_LIST)

    const client = new Twitter({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });
}

const getMpList = async () => {
    const siteUrl = "https://www.eduskunta.fi/FI/kansanedustajat/Sivut/Kansanedustajat-aakkosjarjestyksessa.aspx";

    console.log(`Fetching data from URL: ${siteUrl}`)
    const $ = await fetchData(siteUrl)
    const linkItems = $('#maincontent #WebPartWPQ2 div.link-item') // these contain the needed details

    if (linkItems && linkItems.length > 190) {
        // enough links have been found

        // scrape mep information from the site
        const mepsFetched = [];
        linkItems.each((i, elem) => {
            const name = $(elem).find('a').text();
            const party = $(elem).find('div.description').text();
            mepsFetched[i] = { name: name, party: party };
        });

        return mepsFetched;
    }
}

getMpList()

exports.mpDetails = (req, res) => {
    const query = req.query || req.body;

    if (query.data && query.data === 'mp_list') {
        res.status(200).send(getMpList());
    }

    //let message = req.query.message || req.body.message || 'Hello World!';

    const message = 'Please specify requested response type.'
    res.status(200).send(message);
};