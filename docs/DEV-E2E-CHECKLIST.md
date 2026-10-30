# DEV E2E checklist

- [ ] Open the web DEV domain from another machine and log in.
- [ ] Create or select a raffle and open registrations.
- [ ] Add participants and tickets; validate tickets.
- [ ] Open `/live/<slug>` from the remote machine and confirm no authentication is required.
- [ ] Run `/live/<slug>?demo=1`; confirm `MODO ENSAYO` and no draw records are created.
- [ ] Refresh the live display and confirm it rehydrates from `/api/v1/public/raffles/<slug>/live-state`.
- [ ] Close registrations and confirm READY, snapshot hash and seed commitment.
- [ ] Restart the API while READY; reload the live display and confirm READY persists.
- [ ] Execute the real draw and confirm WINNER synchronization.
- [ ] Refresh the live display after completion; confirm the winner remains.
- [ ] Open `/verify/<drawId>` and confirm VALID.
- [ ] Add the live URL as an OBS Browser Source at 1920x1080 and test a WebSocket reconnect.
