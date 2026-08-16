console.log("TechHome admin — products frontend javascript file");
 
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
      const response = await axios.post(`/admin/product/${id}`, { productStatus: nextStatus });
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
      console.log(err);
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