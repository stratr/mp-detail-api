/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const cheerio = require('cheerio')
const axios = require("axios")
const Twitter = require('twitter');
const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();
require('dotenv').config()

const fetchData = async (siteUrl) => {
    const result = await axios.get(siteUrl);
    return cheerio.load(result.data);
};

const getTwitterList = async () => {
    //console.log(process.env.TWITTER_LIST)

    const client = new Twitter({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });

    const twitterList = await client.get('lists/members', {
        list_id: process.env.TWITTER_LIST,
        count: 300
    });

    const memberScreenNames = twitterList.users.map(member => {
        return {
            screen_name: member.screen_name,
            name: member.name
        }
    });

    //console.log(memberScreenNames);

    return memberScreenNames;
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

const getBqList = async (structure) => {
    const options = {
        maxResults: 10000,
    };

    let query;
    if (strucuture === 'flat') {
        query = 'SELECT * FROM `tanelis.meps.mp_data_flat_prod`';
    } else if (strucuture === 'nested') {
        query = 'SELECT * FROM `tanelis.meps.mp_data_prod_view`';
    }

    if (query) {
        const queryResults = await bigquery.query(query, options);

        return queryResults[0];
    }

    return null;
}

//getMpList()
//getTwitterList()
//console.log(getBqList())

exports.mpDetails = async (req, res) => {
    const query = req.query || req.body;

    if (query.data && query.data === 'mp_list') {
        const mpList = await getMpList();
        res.status(200).send(mpList);
    } else if (query.data && query.data === 'twitter_list') {
        const twitterList = await getTwitterList();
        res.status(200).send(twitterList);
    } else if (query.data &&
        query.data === 'bigquery_list') {
        const bqList = await getBqList(query.structure);
        res.status(200).send(bqList);
    }

    //let message = req.query.message || req.body.message || 'Hello World!';

    const message = 'Please specify requested response type.'
    res.status(200).send(message);
};