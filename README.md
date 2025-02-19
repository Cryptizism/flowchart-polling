# Flowchart Polling for Twitch

This system was made for the MaxGGs channel and will not be maintained.

This allows a streamer to make a non-circular flowchart for polls and twitch chat gets to decide what routes to take and different polls will show for different scenarios! A bit like detroit become human.

Make sure to edit `.env.example` and change it to `.env`

This code is by far not clean and the actions to communicate are **NOT** proper uses of websockets, **DO NOT** replicate this for your own projects, it just kind of happened whilst finishing most of this project in 2 days.

## Getting Started

1. Run `npm i`
2. Run `npm run dev`
3. Done.

## Known Issues
1. The flowchart doesn't work in certain scenarios (notice 23 in the example data)
2. You cannot add scenarios from the UI only directly in the db
3. Triggering select winner continues if you double click


> No errors will be fixed.

## Views
1. You can view on the root `/` for the dashboard
2. You can view the overlay on `/overlay`

## Examples
![image](https://github.com/user-attachments/assets/5db1daf5-ce15-49f6-8aeb-a48f5e4aadcd)

![image](https://github.com/user-attachments/assets/892ce0d8-9a75-4537-8334-48318c1735a2)
