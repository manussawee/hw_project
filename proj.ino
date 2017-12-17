#include <SoftwareSerial.h>
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <ESP8266HTTPClient.h>

ESP8266WiFiMulti WiFiMulti;

SoftwareSerial mySerial(13, 15); // RX, TX ports

char data[100] = {};
char dataOut[20];
int idx = 0;
String payload="[";

void setup() {
  // set the data baud rate 
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect. 
  }
  mySerial.begin(115200);

  for(uint8_t t = 2; t > 0; t--) {
      Serial.printf("[SETUP] WAIT %d...\n", t);
      Serial.flush();
      delay(1000);
  }

  WiFiMulti.addAP("NottWIFI", "11223344");
}

void loop() { 
  if(mySerial.available()){

      data[idx++] = mySerial.read();
      if(data[idx-1] == 'w'){
        Serial.println("WWWWWWWWWWWWWWWWWW");
        idx = 0;
        Serial.println(payload);
        if(payload=="[")
          mySerial.write('[');
        else if(payload=="]")
          mySerial.write(']');
        else
          mySerial.write('N');
           
      }
      else if(data[idx-1] == ']') {
        data[idx] = '\0';
        Serial.println(data);
        idx = 0;
        if(WiFiMulti.run() == WL_CONNECTED){

          HTTPClient http;
          Serial.print("[HTTP] begin...\n");
          
          char url[100];
          
          sprintf(url,"http://192.168.43.45:8000/receive_data/?data=%s",data);
          Serial.println(url);
          http.begin(url); //HTTP
          Serial.print("[HTTP] GET...\n");
    
          int httpCode = http.GET();
          if(httpCode > 0) {
            Serial.printf("[HTTP] GET... code: %d\n", httpCode);
            if(httpCode == HTTP_CODE_OK) {
              payload = http.getString();
              Serial.print("string = ");
              Serial.println(payload);
            }
          } 
          
        }
      }

      
 
      


    }

  
}
