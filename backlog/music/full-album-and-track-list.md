# Music Section Extension

I want to extend the music section of my website with the following albums and singles. 
A few of these are already on the site, but I want to prepare the full list for when I have time to update it.
There will be a backstory at the group level, and then a backstory for each album, but I want to get the structure in place now.
So, for each item in the list below, I want to create a section on the website with the title of the item, and then a list of the songs in that item.
Mark the unfinished items with a "Comming Soon" note that they are still in progress, and link to the existing pages for the items that are already on the site.
```
Pretty polygrass
    - Vol 1
        - Heaven's Still Ahead
        - Jesus Saves
        - Grace and Mercy
        - Dust and Glory
        - The Old Rugged Road
        - Pickin’ Through the Storm
        - God Don’t Scroll
        - Blood on the Mountain
        - No Signal, Still Heard
        - Baptized in Backwater
        - The Second Time v2.0
        - Heaven's Front Porch
        - The Roots Run Deep
        - Sing Me Home

    - Vol 2
        - Imposters
        - Eyelashes Upside Down
        - Am I Even Me
        - Letting Go v0.2
        - So-so, So Far

Yellowstone 25
    - Vol 1
        - Backroads to the West
        - Wagon Ruts and Railroad Tracks
        - Yellowstone Bound
        - Campfire Nights
        - Spirit of the Land
        - Baker’s General Store
        - Wolves Came Home
        - Voices in the Canyon
        - Buffalo Country
        - Trail Dust and Dreams
        - River Runs Free
        - Fires of ’88
        - Big Sky Horizon
        - Here's Good

    - Vol 2
        - Ashes of the Dawn
        - Distant Thunder
        - Farewell to the Open Sky
        - Red Earth Rising
        - Canyon Spirit (Reprise)
        - Ashes of the Dawn (Reprise)
        - Farewell to the Open Sky (Reprise)
        - Distant Thunder (Major Drama)
        - Lamar by Moonlight (Reprise)
        - Red Earth Rising (Drama)
        - Canyon Spirit
        - Ashes of the Dawn (Reprise, Revisited)
        - Distant Thunder (Tension)
        - River’s Journey (Drama)
        - Distant Thunder (Smooth Move)

    - Vol 3
        - Crossed That River Thrice
        - Nebraska Surprise
        - Bunkhouse Jammin
        - Farther on in the West
        - Jackson Rising
        - Rainy Day Jackson
        - Blankets in the Back
        - Hell Below
        - Cowboy Cookout Blues
        - Caught in the Herd
        - Lamar by Moonlight
        - Firehole Repose
        - Gardiner Opry
        - Yellow Lake Hotel
        - Geyser Time
        - Shopping Estes
        - Keeping the Lights On
        - Sacajawea's Grave
        - Long Branch Saloon
        - Santa Fe Trail

Singles
    - Summer Kneels to Fall
    - Mixtape and Woodgrain
    - Sacajawea's Grave (Reprise)
```

## Helpful javascript snippet

I used the following line of javascript in the browser console to scrape the titles from the Suno UI.

`Array.from(document.getElementsByClassName('cursor-pointer hover:underline')).forEach(el => console.log(el.innerHTML));`

