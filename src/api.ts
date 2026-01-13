import axios from "axios";

const parkestApi = "https://parking-api-ymux.onrender.com/api/";

export async function Login(username: string, password: string) {
  try {
    const res = await axios.post(parkestApi + "login", { username, password });
    if (res.status !== 200) throw new Error("login failed");
    return res.data;
  } catch (error) {
    console.error("Erreur de connexion détaillée :", error);
    throw new Error("login failed");
  }
}

export async function Register(username: string, password: string) {
  try {
    const res = await axios.post(parkestApi + "register", { username, password });
    if (res.status !== 200) throw new Error("register failed");
    return res.data;
  } catch (error) {
    console.error("Erreur d'inscription détaillée :", error);
    throw new Error("register failed");
  }
}

export async function UpddateParams(token: string, hauteur: number, pmr: boolean, dspOnly: boolean, electrique: boolean) {
  try {
    const res = await axios.post(parkestApi + "updateParams", { token, hauteur, pmr, dspOnly, electrique });
    if (res.status !== 200) throw new Error("update failed");
    return res.data;
  } catch {
    throw new Error("update failed");
  }
}

export async function GetParams(token: string) {
  try {
    const res = await axios.get(parkestApi + "getParams", { params: { token } });
    if (res.status !== 200) throw new Error("get params failed");
    return res.data;
  } catch {
    throw new Error("get params failed");
  }
}