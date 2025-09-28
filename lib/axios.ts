import Axios from "axios";

export const api = Axios.create({
  baseURL: "",
  withCredentials: true,
});
