# KML Sender

The KML Sender application provides an example of how the Sit(x) bridge adapter feature can be used. In this application, KML files are read from a directory. The contents of each KML file are crafted into Cursor-on-Target (CoT) XML messages and are sent to the Sit(x) bridge adapter.

You will need to s a `.env` file. The NodeJS process relies on a `.env` file to control the following parameters:
  - **ACCESSKEY** _The access key for the SitX bridge adapter._
  - **SECRETKEY** _The secret key for the SitX bridge adapter._
  - **SCOPE** _The scope for the SitX bridge adapter._
  - **STREAMING** _The WebSocket streaming URL for the SitX bridge adapter._

<br>

The application can be compiled and launched by first installing NodeJS, then from the CLI:
1. Create the `.env` file
2. `npm install`
3. `npm start`

<br>

Copyright (©) PAR Government Systems Corporation. All rights reserved.