import { api } from "../api.js";
import { isAuthenticated, saveSession } from "../auth.js";
import { applyTheme, getSavedTheme, showSpinner, hideSpinner, showToast } from "../ui.js";

applyTheme(getSavedTheme());

if (isAuthenticated()) {
  globalThis.location.href = "dashboard.html";
}

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value
  };

  showSpinner();
  try {
    const response = await api.login(payload);
    saveSession(response.user);
    showToast("Login successful", "success");
    globalThis.setTimeout(() => {
      globalThis.location.href = "dashboard.html";
    }, 350);
  } catch (error) {
    showToast(error.message || "Login failed", "error", 3000);
  } finally {
    hideSpinner();
  }
});
