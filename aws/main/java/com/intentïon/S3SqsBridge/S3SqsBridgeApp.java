package com.intentïon.S3SqsBridge;

import software.amazon.awscdk.App;

public class S3SqsBridgeApp {
    public static void main(final String[] args) {
        App app = new App();
        new S3SqsBridgeStack(app, "S3SqsBridgeStack");
        app.synth();
    }
}
