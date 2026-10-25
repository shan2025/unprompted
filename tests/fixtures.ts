// Human samples are public-domain texts, so we know a person wrote them.
// The machine-style samples imitate typical chatbot output.

export const THOREAU = `I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived. I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary. I wanted to live deep and suck out all the marrow of life, to live so sturdily and Spartan-like as to put to rout all that was not life, to cut a broad swath and shave close, to drive life into a corner, and reduce it to its lowest terms, and, if it proved to be mean, why then to get the whole and genuine meanness of it, and publish its meanness to the world; or if it were sublime, to know it by experience, and be able to give a true account of it in my next excursion.

Still we live meanly, like ants; though the fable tells us that we were long ago changed into men. Our life is frittered away by detail. An honest man has hardly need to count more than his ten fingers, or in extreme cases he may add his ten toes, and lump the rest. Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand; instead of a million count half a dozen, and keep your accounts on your thumb-nail.`;

export const CASUAL_HUMAN = `ok so I finally finished the shelf. took three weekends, two trips back to the hardware store, and one very stupid moment where I glued the top on upside down. honestly it's crooked if you look at it from the left. but it holds all my records and the cat hasn't knocked it over yet, which is more than I can say for the last one!!

Next time I'm buying a real clamp. The rubber band trick does not work, whatever that guy on the forum says.`;

export const MACHINE_PROSE = `In today's fast-paced digital landscape, creativity has become more important than ever. It's not just about producing content—it's about crafting meaningful experiences that resonate with audiences. Moreover, creators must navigate the complexities of an ever-evolving market. Whether you're a seasoned artist or just starting out, embracing authenticity can unlock the full potential of your work.

Furthermore, the rich tapestry of human expression serves as a testament to our shared journey. Additionally, fostering genuine connections plays a crucial role in building a sustainable creative career. By leveraging innovative tools and maintaining a holistic perspective, artists can elevate their craft to new heights. Ultimately, the key takeaways are clear: authenticity, consistency, and passion.

In conclusion, it's important to note that success in the creative realm requires a multifaceted approach. Let's dive into the strategies that can transform your creative journey—and help you thrive in this vibrant, dynamic, and rewarding landscape.`;

export const FROST = `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same,`;

export const DICKINSON = `Because I could not stop for Death –
He kindly stopped for me –
The Carriage held but just Ourselves –
And Immortality.

We slowly drove – He knew no haste
And I had put away
My labor and my leisure too,
For His Civility –`;

export const MACHINE_POEM = `In the quiet of the twilight hour,
The stars above begin to glow,
Soft whispers dance on gentle breeze,
A tapestry of dreams below.

The silver moon in velvet skies,
Embraces hearts with tender light,
Eternal echoes softly rise,
As boundless dreams take flight.`;

export const MACHINE_CODE = `import requests

def fetch_user_data(user_id):
    """
    Fetch user data from the API.

    Args:
        user_id (int): The ID of the user.

    Returns:
        dict: The user data.
    """
    # Define the API endpoint
    url = f"https://api.example.com/users/{user_id}"
    # Send a GET request to the API
    response = requests.get(url)
    # Check if the request was successful
    if response.status_code == 200:
        # Return the JSON data
        print("✅ Successfully fetched user data!")
        return response.json()
    # Return None if the request failed
    print("❌ Failed to fetch user data.")
    return None

def process_users(user_ids):
    """
    Process a list of user IDs.

    Args:
        user_ids (list): A list of user IDs.
    """
    # Loop through each user ID
    for user_id in user_ids:
        # Fetch the user data
        data = fetch_user_data(user_id)
        # Print the user data
        print(data)

# Example usage
if __name__ == "__main__":
    process_users([1, 2, 3])`;

export const HUMAN_CODE = `import requests

API = "https://api.example.com"

def user(uid):
    r = requests.get(f"{API}/users/{uid}", timeout=5)
    # TODO: retry on 429, the staging box rate-limits like crazy
    if r.ok:
        return r.json()
    # print(r.status_code, r.text)
    return None

def sync(ids):
    out = {}
    for i in ids:
        u = user(i)
        if u and not u.get("deleted"):  # deleted users still come back, FIXME upstream
            out[i] = u
    return out`;
