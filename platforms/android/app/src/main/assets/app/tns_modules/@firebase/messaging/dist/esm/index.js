/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
import WindowController from './src/controllers/window-controller';
import SWController from './src/controllers/sw-controller';
import { firebase } from '@firebase/app';
export function registerMessaging(instance) {
    var messagingName = 'messaging';
    var factoryMethod = function (app) {
        if (self && 'ServiceWorkerGlobalScope' in self) {
            return new SWController(app);
        }
        // Assume we are in the window context.
        return new WindowController(app);
    };
    var namespaceExports = {
        // no-inline
        Messaging: WindowController
    };
    instance.INTERNAL.registerService(messagingName, factoryMethod, namespaceExports);
}
registerMessaging(firebase);

//# sourceMappingURL=index.js.map
