#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

// Scene uniforms (from Light3D)
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

// Model uniforms (material of the object)
uniform vec4 u_ambientColor; //ambient material
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    // v_normal must be normalized because the GPU interpolates the
    // per-vertex value for every fragment.
    vec3 normal = normalize(v_normal);

    // Normalize the direction vectors the same way.
    vec3 surfToLightDirection = normalize(v_surfaceToLight);
    vec3 surfToViewDirection = normalize(v_surfaceToView);

    // ------------------------------------------------------------------
    // TODO 1: Ambient term
    //         The light contribution that reaches the surface no matter
    //         its orientation. Combines the material colors with the
    //         light.
    // vec4 ambientColor = vec4(0.0);  // PLACEHOLDER: replace me
    
    vec4 ambientColor = u_ambientLight * u_ambientColor;

    // TODO 2: Diffuse term (Lambert's law)
    //         The light absorbed and re-emitted by the surface, based on
    //         how directly the normal faces the light. A surface facing
    //         away from the light contributes nothing (negative values
    //         are not physical).
    // vec4 diffuseColor = vec4(0.0);  // PLACEHOLDER: replace me
    float nDotL = dot(normal, surfToLightDirection);
    float diffuseIntensity = max(nDotL, 0.0);
    vec4 diffuseColor = diffuseIntensity * u_diffuseColor * u_diffuseLight;

    vec3 reflectionVector = 2.0 * nDotL * normal - surfToLightDirection;

    vec4 specularColor = vec4(0.0);
    if (nDotL > 0.0) {
        float specularIntensity = pow(
            max(dot(reflectionVector, surfToViewDirection), 0.0), u_shininess);
        specularColor = specularIntensity * u_specularColor * u_specularLight;
    }

    outColor = ambientColor + diffuseColor + specularColor;
}
