 
$(function () {
  $("#process-btn").on("click", () => {
    $(".items-container").slideToggle(500);
    $("#process-btn").css("display", "none");
  });
 
  $("#cancel-btn").on("click", () => {
    $(".items-container").slideToggle(100);
    $("#process-btn").css("display", "inline-block");
  });
 
  // Maps a productStatus value to the stat-card <div id="..."> it affects.
  // "Low stock" isn't status-driven (it's based on productLeftCount), so a
  // status change never touches it — that card only changes on create/edit.
  const STATUS_CARD_MAP = {
    PROCESS: "#stat-active",
    PAUSE: "#stat-paused",
    DELETE: "#stat-deleted",
  };
 
  function adjustStatCard(status, delta) {
    const selector = STATUS_CARD_MAP[status];
    if (!selector) return;
    const el = $(selector);
    el.text(Number(el.text()) + delta);
  }
 
  $(".new-product-status").on("change", async function (e) {
    const select = $(this);
    const id = e.target.id;
    const previousStatus = select.attr("data-status");
    const nextStatus = select.val();
 
    try {
      const response = await axios.post(`/admin/product/${id}`, { productStatus: nextStatus }, { headers: { "X-CSRF-Token": $('meta[name="csrf-token"]').attr("content") } });
      const result = response.data;
      if (result.data) {
        select.attr("data-status", nextStatus);
        adjustStatCard(previousStatus, -1);
        adjustStatCard(nextStatus, +1);
        select.blur();
      } else {
        alert("Product update failed!");
        select.val(previousStatus);
      }
    } catch (err) {
      alert("Product update failed!");
      select.val(previousStatus);
    }
  });
 
  // ---- search + category filter (client-side, over the rendered rows) ----
  function applyProductFilters() {
    const query = $("#product-search").val().trim().toLowerCase();
    const activeCategory = $(".filter-chip.active").data("category");
 
    let visibleCount = 0;
    $(".product-row").each(function () {
      const row = $(this);
      const matchesQuery = !query || row.data("name").includes(query);
      const matchesCategory = activeCategory === "ALL" || row.data("category") === activeCategory;
      const visible = matchesQuery && matchesCategory;
      row.toggle(visible);
      if (visible) visibleCount++;
    });
 
    const total = $(".product-row").length;
    $("#showing-text").text(`Showing ${visibleCount ? 1 : 0}–${visibleCount} of ${total} products`);
  }
 
  $("#product-search").on("input", applyProductFilters);
 
  $(".filter-chip").on("click", function () {
    $(".filter-chip").removeClass("active");
    $(this).addClass("active");
    applyProductFilters();
  });
  const priceDialog = document.getElementById("price-deal-dialog");
  if (priceDialog) {
    const form = document.getElementById("price-deal-form");
    const currentPrice = document.getElementById("deal-current-price");
    const oldPrice = document.getElementById("deal-old-price");
    const error = document.getElementById("price-deal-error");
    const save = document.getElementById("price-deal-save");
    let selectedButton = null, saving = false;
    $(".price-deal-button[data-id]").on("click", function () {
      selectedButton = $(this);
      form.reset(); oldPrice.setCustomValidity(""); error.hidden = true;
      document.getElementById("price-deal-name").textContent = selectedButton.attr("data-name");
      currentPrice.value = selectedButton.attr("data-price");
      oldPrice.value = selectedButton.attr("data-old-price") || "";
      priceDialog.showModal(); currentPrice.focus();
    });
    oldPrice.addEventListener("input", () => oldPrice.setCustomValidity(""));
    currentPrice.addEventListener("input", () => oldPrice.setCustomValidity(""));
    document.getElementById("price-clear-deal").addEventListener("click", () => { oldPrice.value = ""; oldPrice.setCustomValidity(""); oldPrice.focus(); });
    document.getElementById("price-deal-cancel").addEventListener("click", () => { if (!saving) priceDialog.close(); });
    priceDialog.addEventListener("cancel", event => { if (saving) event.preventDefault(); });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (saving || !selectedButton) return;
      oldPrice.setCustomValidity("");
      if (oldPrice.value !== "" && Number(oldPrice.value) <= Number(currentPrice.value)) oldPrice.setCustomValidity("Old price must be higher than the current price.");
      if (!form.reportValidity()) return;
      saving = true; error.hidden = true;
      $(form).find("input, button").prop("disabled", true); save.textContent = "Saving…";
      try {
        const response = await axios.post(`/admin/product/${selectedButton.attr("data-id")}`, { productPrice: currentPrice.value, productOldPrice: oldPrice.value }, { headers: { "X-CSRF-Token": $('meta[name="csrf-token"]').attr("content") } });
        const product = response.data.data;
        if (!product || !Number.isFinite(product.productPrice)) throw new Error("Invalid price response");
        const hasDeal = typeof product.productOldPrice === "number" && product.productOldPrice > product.productPrice;
        const row = selectedButton.closest(".product-row");
        row.find(".current-product-price").text(`$${product.productPrice.toFixed(2)}`);
        row.find(".old-product-price").text(hasDeal ? `$${product.productOldPrice.toFixed(2)}` : "").prop("hidden", !hasDeal);
        row.find(".product-deal-badge").prop("hidden", !hasDeal);
        selectedButton.attr("data-price", product.productPrice).attr("data-old-price", hasDeal ? product.productOldPrice : "");
        const status = document.getElementById("price-update-status"); status.textContent = "Prices saved."; status.hidden = false;
        priceDialog.close();
      } catch (err) {
        const code = err.response && err.response.data && err.response.data.code;
        const messages = { INVALID_DISCOUNT: "Old price must be higher than the current price.", INVALID_PRODUCT: "Please check the prices. Use up to two decimal places.", PRODUCT_CHANGED: "This product changed. Reload the page and try again.", CSRF_INVALID: "Your session changed. Reload the page and try again." };
        error.textContent = messages[code] || "Unable to save prices. Please try again or reload the page."; error.hidden = false;
      } finally {
        saving = false; $(form).find("input, button").prop("disabled", false); save.textContent = "Save prices";
      }
    });
  }
});
 
function validateForm() {
  const productName = $(".product-name").val(),
   productPrice = $(".product-price").val(),
   productLeftCount = $(".product-left-count").val(),
   productCategory = $(".product-category").val(),
   productDesc = $(".product-desc").val();
 
  if (
    productName === "" ||
    productPrice === "" ||
    productLeftCount === "" ||
    productCategory === "" ||
    productDesc === ""
  ) {
    alert("Please insert all details!");
    return false;
  } else return true;
}
 
function previewFileHandler(input, order) {
  const imgClassName = input.className;
 
  const file = $(`.${imgClassName}`).get(0).files[0];
  if (!file) return;
 
  const fileType = file["type"],
   validImageType = ["image/jpeg", "image/jpg", "image/png"];
 
  if (!validImageType.includes(fileType)) {
    alert("Please insert only jpeg, jpg and png");
  } else {
    const reader = new FileReader();
    reader.onload = function () {
      $(`#image-section-${order}`).attr("src", reader.result);
    };
    reader.readAsDataURL(file);
  }
}