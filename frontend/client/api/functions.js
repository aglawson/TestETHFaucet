import axios from 'axios';

const apiUrl = 'https://aglawson.uw.r.appspot.com';
// const apiUrl = 'http://localhost:8080'
export const getAuthUrl = async() => {
    const response = await axios.get(`${apiUrl}/get_auth_url`);
    return response.data;
}

export const TwitterLookup = async (token, token_secret) => {
    const result = await axios.get(`${apiUrl}/twitter_lookup?oauth_token=${token}&oauth_token_secret=${token_secret}`)
    return result.data;
}

export const UpdateUser = async(wallet, attribute, value, message, signature) => {
    const result = await axios.get(`${apiUrl}/update_user?wallet=${wallet}&attribute=${attribute}&value=${value}&message=${message}&signature=${signature}`)
    return result.data;
}

export const getAccessToken = async (pin, requestToken) => {
    let enc_token = requestToken;
    const result = await axios.get(`${apiUrl}/get_access_token?pin=${pin}&requestToken=${enc_token}`)
    return result.data;
}

export const Drip = async (twitter, wallet) => {
    const result = await axios.get(`${apiUrl}/drip?twitter=${twitter}&wallet=${wallet}`);
    return result.data;
}

export const AddFaucetUser = async (wallet, twitter, message, signature) => {
    const result = await axios.get(`${apiUrl}/add_faucet_user?handle=${twitter}&wallet=${wallet}&message=${message}&signature=${signature}`);
    return result.data
}

export const GetUser = async (wallet) => {
    const result = await axios.get(`${apiUrl}/get_user?wallet=${wallet}`);
    return result.data
}

export const GetFaucetUserCount = async () => {
    const result = await axios.get(`${apiUrl}/get_faucet_user_count`);
    console.log(result)
    return result.data
}