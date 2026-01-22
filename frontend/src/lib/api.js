const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function reserve({
  lotId,
  slotId,
  plateNumber,
  duration,
  userId,
  startAt,
}) {
  const res = await fetch(`${API_URL}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lotId,
      slotId,
      plateNumber,
      duration,
      userId,
      startAt,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reservation failed");

  return data;
}

export async function cancelReservation(reservationId) {
  const res = await fetch(`${API_URL}/reservations/${reservationId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Cancel failed");

  return data;
}

export async function extendReservation(reservationId, minutes) {
  const res = await fetch(`${API_URL}/reservations/${reservationId}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extraMinutes: minutes }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Extend failed");

  return new Date(data.newExpiresAt);
}

export async function arriveReservation(reservationId) {
  const res = await fetch(`${API_URL}/reservations/${reservationId}/arrive`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Arrive failed");
  return data;
}

export async function leaveReservation(reservationId) {
  const res = await fetch(`${API_URL}/reservations/${reservationId}/leave`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Leave failed");
  return data;
}
