export async function parseJson(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error("Invalid JSON body: " + (err && err.message));
  }
}
