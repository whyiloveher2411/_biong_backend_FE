import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import _extends from "@babel/runtime/helpers/esm/extends";
// This module is based on https://github.com/airbnb/prop-types-exact repository.
// However, in order to reduce the number of dependencies and to remove some extra safe checks
// the module was forked.
// Only exported for test purposes.
export var specialProperty = "exact-prop: \u200B";
export default function exactProp(propTypes) {
    //eslint-disable-next-line
    if (process.env.NODE_ENV === 'production') {
        return propTypes;
    }

    return _extends({}, propTypes, _defineProperty({}, specialProperty, function (props) {
        var unsupportedProps = Object.keys(props).filter(function (prop) {
            //eslint-disable-next-line
            return !propTypes.hasOwnProperty(prop);
        });

        if (unsupportedProps.length > 0) {
            return new Error("The following props are not supported: ".concat(unsupportedProps.map(function (prop) {
                return "`".concat(prop, "`");
            }).join(', '), ". Please remove them."));
        }

        return null;
    }));
}