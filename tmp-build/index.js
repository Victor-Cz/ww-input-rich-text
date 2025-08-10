
        import component from '../src/wwElement.vue'
        import configuration from '../ww-config.js'

        const name = "__NAME__";
        const version = '__VERSION__';

        const config = { ...configuration };
        if (name.indexOf('__') !== 0){
            config.name = name;
        }
        config.wwDev = false,
        config.port = undefined;

        function addComponent() {
            if (window.addWwComponent) {
                window.addWwComponent({
                    name,
                    version,
                    content: component,
                    type: 'wwobject',
                    wwDev: false,
                    port: undefined,
                    config,
                });
                return true;
            }
            return false;
        }

        if (!addComponent()) {
            const iniInterval = setInterval(function () {
                if (addComponent()) {
                    clearInterval(iniInterval);
                }
            }, 10);
        }