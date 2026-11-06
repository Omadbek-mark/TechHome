// Maps a memberStatus value to the stat-card <div id="..."> it affects.
// Keys must match the actual MemberStatus enum values sent by the <select>
// and stored in the DB: ACTIVE / BLOCK / DELETE.
const STATUS_CARD_MAP = {
  ACTIVE: "#stat-active",
  BLOCK: "#stat-blocked",
  DELETE: "#stat-deleted",
};

function adjustStatCard(status, delta) {
  const selector = STATUS_CARD_MAP[status];
  if (!selector) return;
  const el = $(selector);
  el.text(Number(el.text()) + delta);
}

$(function () {
  $(".member-status").on("change", function (e) {
    const select = $(this);
    if (select.prop('disabled')) return;
    select.prop('disabled', true);
    const id = e.target.id;
    const previousStatus = select.attr("data-status"); // status before this change
    const nextStatus = select.val();                    // status the user just picked

    axios
      .post("/admin/user/edit", {
        _id: id,
        memberStatus: nextStatus,
      }, { headers: { "X-CSRF-Token": $('meta[name="csrf-token"]').attr("content") } })
      .then((response) => {
        const result = response.data;

        if (result.data) {
          // Only touch the UI once the backend has confirmed the change.
          select.attr("data-status", nextStatus);
          adjustStatCard(previousStatus, -1);
          adjustStatCard(nextStatus, +1);
          select.blur();
        } else {
          alert("User update failed!");
          select.val(previousStatus); // roll the dropdown back
        }
      })
      .catch((err) => {
        alert("User update failed");
        select.val(previousStatus); // roll the dropdown back
      })
      .finally(() => select.prop("disabled", false));
  });

  // ---- search (client-side, over the rendered rows) ----
  $("#user-search").on("input", function () {
    const query = $(this).val().trim().toLowerCase();
    $(".user-row").each(function () {
      const row = $(this);
      row.toggle(!query || row.data("name").includes(query));
    });
  });
});