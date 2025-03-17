package com.intentïon.TansuSqsBridge;

import software.amazon.awscdk.App;

public class TansuSqsBridgeApp {
    public static void main(final String[] args) {
        App app = new App();
        new TansuSqsBridgeStack(app, "TansuSqsBridgeStack");
        app.synth();
    }
}
