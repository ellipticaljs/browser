
/*
 * =============================================================
 * elliptical.Controller
 * =============================================================
 *
 * Controller factory for an expressJS style application function
 * var controller = new elliptical.Controller(app,'controllerName');
 *
 * controller('/@action/:id',f1,...fn,{
 *   Action1:function(req,res,next){},
 *   ActionN:function(req,res,next){},
 *   Post:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 *   Put:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 *   Delete:{
 *      Action1:function(req,res,next){},
 *      ActionN:function(req,res,next){},
 *   },
 * });
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-utils'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-utils'], factory);
    } else {
        root.elliptical=root.elliptical || {};
        root.elliptical.Controller = factory(root.elliptical.utils);
        root.returnExports = root.elliptical.Controller;
    }
}(this, function (utils) {

    var GET='Get';
    var POST='Post';
    var PUT='Put';
    var DELETE='Delete';
    var DEFAULT_METHOD='get';
    /* Controller is a factory for the app function.
     * Example:
     * var controller=new elliptical.Controller(app,'Company');
     * controller('/@action',{
     *  Index:function(req,res,next){},
     *  About:function(req,res,next){},
     *  Contact:function(req,res,next){},
     *  Post:{
     *      Contact:function(req,res,next){}
     *   }
     * }
     *
     * instead of app.get('/Company/Home',function(req,res,next){}),app.get('/Company/About',function(req,res,next){})
     *            app.get('/Company/Contact',function(req,res,next){}),app.post('/Company/Contact',function(req,res,next){})
     *
     * NOTE: can pipe middleware on the controller but lose the granularity of scoping to individual actions
     *
     * */
    var array=utils.array;
    var Controller;

    /**
     *
     * @param {function} app
     * @param {string} name
     * @returns {function}
     * @constructor
     * @public
     */
    Controller = function (app, name) {
        this.app = app;
        this.name = name;

        /**
         * @param {string} route
         * @param {object} obj
         * @returns {function}
         */
        return function (route, obj) {
            var args = [].slice.call(arguments);
            var route_ = args[0];
            if (typeof route_ !== 'string') {
                throw "Controller requires a route string with an '@action' placeholder  as the first parameter";
            }
            var obj_ = args.pop();
            if (typeof obj_ === 'object') {
                ///iterate shallow action props first(will be assigned method='get')
                iterateControllerActions(args, obj_, DEFAULT_METHOD, app, name);

                ///iterate sub action props of any defined shallow method props
                [GET, POST, PUT, DELETE].forEach(function (method) {
                    if (obj_[method] && typeof obj_[method] === 'function') throw "Controller requires an @action param";
                    else iterateControllerActions(args, obj_[method], method, app, name);
                });
            } else throw 'Controller requires the last function parameter to be an object';
        }
    };

    /**
     *
     * @param {array} args
     * @param {object} obj
     * @param {string} method
     * @param {function} app
     * @param {string} name
     * @private
     */
    function iterateControllerActions(args,obj,method,app,name){
        for(var prop in obj){
            if(!(prop===GET || prop===POST || prop===PUT || prop===DELETE)){
                if(obj.hasOwnProperty(prop))bindControllerAction(prop,args,obj,method,app,name);
            }
        }
    }

    /**
     *
     * @param {string} action
     * @param {array} args
     * @param {object} obj
     * @param {string} method
     * @param {function} app
     * @param {string} name
     * @private
     */
    function bindControllerAction(action,args,obj,method,app,name){
        var length;
        var clonedArgs_=array.clone(args);
        if (action === 'Index' && !testIndexProp(clonedArgs_[0])) { //e.g.,: "/Home/Index" =>"/Home", "/Product/Index/1" => "/Product/Index/1"
            clonedArgs_[0] = clonedArgs_[0].replace(/@action/g, '');
        }else{
            var action_=action.replace(/_/g,'-'); //ex: '/Sign-In' ---> Sign_In:fn()
            clonedArgs_[0]=clonedArgs_[0].replace(/@action/g,action_);
        }
        length=clonedArgs_[0].length;
        if(name.toLowerCase() !=='home'){
            clonedArgs_[0] =(length>1) ? '/' + name  + clonedArgs_[0] : '/' + name;
        }
        ///private props to maintain controller name/action reference in the event of js minification
        obj[action].__name=name;
        obj[action].__action=action;
        clonedArgs_.push(obj[action]);
        app[method.toLowerCase()].apply(app,clonedArgs_);
    }

    /**
     *
     * @param {array} args
     * @returns {boolean}
     * @private
     */
    function testIndexProp(args) {
        var str = args.split('@action');
        return (str[1] && str[1].length > 1);
    }


    return Controller;

}));